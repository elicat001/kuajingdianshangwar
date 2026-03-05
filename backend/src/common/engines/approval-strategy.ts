import { ActionType, UserRole } from '../enums';

// ─── Interfaces ───────────────────────────────────────────────

export interface ApprovalActionInput {
  actionType: ActionType;
  /** Change percentage (absolute value) */
  deltaPct: number;
  /** Estimated financial impact in USD */
  estimatedImpactUsd: number;
  /** How many SKUs are affected (for batch operations) */
  affectedSkuCount?: number;
  /** Is this a batch/bulk action? */
  isBatch?: boolean;
}

export interface ApprovalDecision {
  requiresApproval: boolean;
  approverRoles: UserRole[];
  riskScore: number;
  reasons: string[];
}

export interface ApprovalThresholds {
  /** Risk score at or above which approval is required */
  approvalThreshold: number;
  /** Risk score at or above which senior approval is required */
  seniorApprovalThreshold: number;
  /** Delta percentage considered "large" */
  largeDeltaPct: number;
  /** Impact USD considered "large" */
  largeImpactUsd: number;
  /** SKU count considered "large batch" */
  largeBatchCount: number;
}

// ─── Defaults ─────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: ApprovalThresholds = {
  approvalThreshold: 40,
  seniorApprovalThreshold: 70,
  largeDeltaPct: 15,
  largeImpactUsd: 5000,
  largeBatchCount: 10,
};

// ─── Risk Weights ─────────────────────────────────────────────

const ACTION_BASE_RISK: Record<ActionType, number> = {
  [ActionType.ADJUST_PRICE]: 30,
  [ActionType.PAUSE_ADGROUP]: 25,
  [ActionType.ADD_NEGATIVE_KEYWORD]: 10,
  [ActionType.ADJUST_BUDGET]: 20,
  [ActionType.ADJUST_BID]: 15,
  [ActionType.CREATE_REORDER]: 20,
  [ActionType.EXPAND_KEYWORDS]: 10,
  [ActionType.CHANGE_MATCH_TYPE]: 15,
};

// ─── ApprovalStrategy ─────────────────────────────────────────

export class ApprovalStrategy {
  private thresholds: ApprovalThresholds;

  constructor(thresholds?: Partial<ApprovalThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Calculate the risk score for a given action.
   * Risk = baseRisk + deltaExcessPenalty + impactExcessPenalty + batchPenalty
   * Score is clamped to [0, 100].
   */
  calculateRiskScore(action: ApprovalActionInput): number {
    let score = ACTION_BASE_RISK[action.actionType] ?? 20;

    // Delta excess penalty: +1 point per 1% above "large" threshold
    if (Math.abs(action.deltaPct) > this.thresholds.largeDeltaPct) {
      const excess = Math.abs(action.deltaPct) - this.thresholds.largeDeltaPct;
      score += Math.min(excess, 30); // cap at 30 extra points
    }

    // Impact excess penalty: +1 point per $500 above "large" threshold
    if (action.estimatedImpactUsd > this.thresholds.largeImpactUsd) {
      const excess = action.estimatedImpactUsd - this.thresholds.largeImpactUsd;
      score += Math.min(Math.floor(excess / 500), 20); // cap at 20 extra points
    }

    // Batch penalty
    if (action.isBatch && action.affectedSkuCount) {
      if (action.affectedSkuCount > this.thresholds.largeBatchCount) {
        score += 15;
      } else if (action.affectedSkuCount > 3) {
        score += 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine whether the action requires approval and who should approve it.
   */
  determineApproval(action: ApprovalActionInput): ApprovalDecision {
    const riskScore = this.calculateRiskScore(action);
    const reasons: string[] = [];
    let requiresApproval = false;
    const approverRoles: UserRole[] = [];

    if (riskScore >= this.thresholds.seniorApprovalThreshold) {
      requiresApproval = true;
      approverRoles.push(UserRole.ADMIN, UserRole.SUPER_ADMIN);
      reasons.push(
        `Risk score ${riskScore} >= senior threshold ${this.thresholds.seniorApprovalThreshold}`,
      );
    } else if (riskScore >= this.thresholds.approvalThreshold) {
      requiresApproval = true;
      approverRoles.push(UserRole.MANAGER, UserRole.ADMIN);
      reasons.push(
        `Risk score ${riskScore} >= approval threshold ${this.thresholds.approvalThreshold}`,
      );
    }

    // Additional checks that force approval regardless of score
    if (
      Math.abs(action.deltaPct) > this.thresholds.largeDeltaPct * 2
    ) {
      requiresApproval = true;
      if (!approverRoles.includes(UserRole.ADMIN)) {
        approverRoles.push(UserRole.ADMIN);
      }
      reasons.push(
        `Delta ${action.deltaPct}% exceeds 2x large threshold (${this.thresholds.largeDeltaPct * 2}%)`,
      );
    }

    if (action.estimatedImpactUsd > this.thresholds.largeImpactUsd * 3) {
      requiresApproval = true;
      if (!approverRoles.includes(UserRole.SUPER_ADMIN)) {
        approverRoles.push(UserRole.SUPER_ADMIN);
      }
      reasons.push(
        `Impact $${action.estimatedImpactUsd} exceeds 3x large threshold ($${this.thresholds.largeImpactUsd * 3})`,
      );
    }

    return {
      requiresApproval,
      approverRoles,
      riskScore,
      reasons,
    };
  }
}
