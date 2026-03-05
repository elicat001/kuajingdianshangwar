import { ActionType } from '../enums';

// ─── Interfaces ───────────────────────────────────────────────

export interface Guardrail {
  type: string;
  /** Maximum price/bid/budget change percentage allowed */
  maxDeltaPct?: number;
  /** Minimum margin floor percentage */
  minMarginFloor?: number;
  /** Cooldown hours between consecutive changes */
  cooldownHours?: number;
  /** Maximum number of changes per calendar day */
  maxChangesPerDay?: number;
  /** Maximum total financial impact in USD for batch operations */
  maxImpactUsd?: number;
}

export interface ActionRequest {
  actionType: ActionType;
  skuId: string;
  /** Delta percentage of the proposed change (e.g., -10 means 10% decrease) */
  deltaPct: number;
  /** Current margin percentage after the proposed change */
  projectedMarginPct?: number;
  /** Estimated financial impact in USD */
  estimatedImpactUsd?: number;
  /** Timestamp of the last change for this SKU + action type */
  lastChangeAt?: Date;
  /** How many changes already happened today for this SKU + action type */
  changesToday?: number;
}

export interface GuardrailCheckResult {
  passed: boolean;
  violations: string[];
}

// ─── Default Guardrails ───────────────────────────────────────

export const DEFAULT_PRICE_GUARDRAIL: Guardrail = {
  type: 'PRICE',
  maxDeltaPct: 15,
  minMarginFloor: 5,
  cooldownHours: 4,
  maxChangesPerDay: 3,
  maxImpactUsd: 5000,
};

export const DEFAULT_BUDGET_GUARDRAIL: Guardrail = {
  type: 'BUDGET',
  maxDeltaPct: 30,
  cooldownHours: 6,
  maxChangesPerDay: 2,
  maxImpactUsd: 2000,
};

export const DEFAULT_BID_GUARDRAIL: Guardrail = {
  type: 'BID',
  maxDeltaPct: 25,
  cooldownHours: 2,
  maxChangesPerDay: 5,
  maxImpactUsd: 1000,
};

export const DEFAULT_BATCH_GUARDRAIL: Guardrail = {
  type: 'BATCH',
  maxImpactUsd: 20000,
};

export const DEFAULT_GENERAL_GUARDRAIL: Guardrail = {
  type: 'GENERAL',
  maxDeltaPct: 20,
  cooldownHours: 4,
  maxChangesPerDay: 5,
  maxImpactUsd: 3000,
};

// ─── GuardrailChecker ─────────────────────────────────────────

export class GuardrailChecker {
  /**
   * Check a single action against the relevant guardrail.
   */
  check(action: ActionRequest, guardrail: Guardrail): GuardrailCheckResult {
    const violations: string[] = [];

    // 1. Max delta percentage check
    if (
      guardrail.maxDeltaPct !== undefined &&
      Math.abs(action.deltaPct) > guardrail.maxDeltaPct
    ) {
      violations.push(
        `Delta ${action.deltaPct.toFixed(2)}% exceeds max allowed ${guardrail.maxDeltaPct}% for ${guardrail.type}`,
      );
    }

    // 2. Minimum margin floor check (pricing only)
    if (
      guardrail.minMarginFloor !== undefined &&
      action.projectedMarginPct !== undefined &&
      action.projectedMarginPct < guardrail.minMarginFloor
    ) {
      violations.push(
        `Projected margin ${action.projectedMarginPct.toFixed(2)}% is below floor ${guardrail.minMarginFloor}%`,
      );
    }

    // 3. Cooldown period check
    if (
      guardrail.cooldownHours !== undefined &&
      action.lastChangeAt !== undefined
    ) {
      const hoursSinceLastChange =
        (Date.now() - action.lastChangeAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastChange < guardrail.cooldownHours) {
        const remainingHours = guardrail.cooldownHours - hoursSinceLastChange;
        violations.push(
          `Cooldown active: ${remainingHours.toFixed(1)} hours remaining (requires ${guardrail.cooldownHours}h between changes)`,
        );
      }
    }

    // 4. Max changes per day check
    if (
      guardrail.maxChangesPerDay !== undefined &&
      action.changesToday !== undefined &&
      action.changesToday >= guardrail.maxChangesPerDay
    ) {
      violations.push(
        `Daily change limit reached: ${action.changesToday}/${guardrail.maxChangesPerDay} changes used today`,
      );
    }

    // 5. Max financial impact check
    if (
      guardrail.maxImpactUsd !== undefined &&
      action.estimatedImpactUsd !== undefined &&
      Math.abs(action.estimatedImpactUsd) > guardrail.maxImpactUsd
    ) {
      violations.push(
        `Estimated impact $${Math.abs(action.estimatedImpactUsd).toFixed(2)} exceeds max $${guardrail.maxImpactUsd}`,
      );
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Check a batch of actions against individual and batch guardrails.
   */
  checkBatch(
    actions: ActionRequest[],
    guardrailMap: Record<string, Guardrail>,
    batchGuardrail?: Guardrail,
  ): GuardrailCheckResult {
    const violations: string[] = [];

    // Check each action individually
    for (const action of actions) {
      const guardrailType = this.resolveGuardrailType(action.actionType);
      const guardrail = guardrailMap[guardrailType];
      if (guardrail) {
        const result = this.check(action, guardrail);
        if (!result.passed) {
          violations.push(
            ...result.violations.map(
              (v) => `[${action.skuId}] ${v}`,
            ),
          );
        }
      }
    }

    // Check batch-level guardrail (total impact)
    if (batchGuardrail && batchGuardrail.maxImpactUsd !== undefined) {
      const totalImpact = actions.reduce(
        (sum, a) => sum + Math.abs(a.estimatedImpactUsd ?? 0),
        0,
      );
      if (totalImpact > batchGuardrail.maxImpactUsd) {
        violations.push(
          `Batch total impact $${totalImpact.toFixed(2)} exceeds max $${batchGuardrail.maxImpactUsd}`,
        );
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Map action type to the corresponding guardrail type.
   */
  private resolveGuardrailType(actionType: ActionType): string {
    switch (actionType) {
      case ActionType.ADJUST_PRICE:
        return 'PRICE';
      case ActionType.ADJUST_BUDGET:
        return 'BUDGET';
      case ActionType.ADJUST_BID:
        return 'BID';
      default:
        return 'GENERAL';
    }
  }
}
