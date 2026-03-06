import { ActionType } from '../enums';

// --- Interfaces ---

export interface Guardrail {
  type: string;
  maxDeltaPct?: number;
  minMarginFloor?: number;
  cooldownHours?: number;
  maxChangesPerDay?: number;
  maxImpactUsd?: number;
}

export interface ActionRequest {
  actionType: ActionType;
  skuId: string;
  deltaPct: number;
  projectedMarginPct?: number;
  estimatedImpactUsd?: number;
  /**
   * P0-05: These fields are now server-populated only.
   * The GuardrailService must query the database for accurate values.
   * Do NOT accept these from client input.
   */
  lastChangeAt?: Date;
  changesToday?: number;
}

export interface GuardrailCheckResult {
  passed: boolean;
  violations: string[];
}

// --- Default Guardrails ---

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

// --- GuardrailChecker ---

export class GuardrailChecker {
  /**
   * Check a single action against the relevant guardrail.
   * IMPORTANT: lastChangeAt and changesToday MUST be queried from DB by the caller.
   */
  check(action: ActionRequest, guardrail: Guardrail): GuardrailCheckResult {
    const violations: string[] = [];

    // 1. Max delta percentage
    if (
      guardrail.maxDeltaPct !== undefined &&
      Math.abs(action.deltaPct) > guardrail.maxDeltaPct
    ) {
      violations.push(
        `Delta ${action.deltaPct.toFixed(2)}% exceeds max allowed ${guardrail.maxDeltaPct}% for ${guardrail.type}`,
      );
    }

    // 2. Minimum margin floor (pricing only)
    if (
      guardrail.minMarginFloor !== undefined &&
      action.projectedMarginPct !== undefined &&
      action.projectedMarginPct < guardrail.minMarginFloor
    ) {
      violations.push(
        `Projected margin ${action.projectedMarginPct.toFixed(2)}% is below floor ${guardrail.minMarginFloor}%`,
      );
    }

    // 3. Cooldown period
    if (
      guardrail.cooldownHours !== undefined &&
      action.lastChangeAt !== undefined
    ) {
      const lastChangeTime = action.lastChangeAt instanceof Date
        ? action.lastChangeAt.getTime()
        : new Date(action.lastChangeAt).getTime();

      if (Number.isNaN(lastChangeTime)) {
        violations.push('Invalid lastChangeAt timestamp — guardrail check blocked');
      } else {
        const hoursSinceLastChange =
          (Date.now() - lastChangeTime) / (1000 * 60 * 60);
        if (hoursSinceLastChange < guardrail.cooldownHours) {
          const remainingHours = guardrail.cooldownHours - hoursSinceLastChange;
          violations.push(
            `Cooldown active: ${remainingHours.toFixed(1)} hours remaining (requires ${guardrail.cooldownHours}h between changes)`,
          );
        }
      }
    }

    // 4. Max changes per day
    if (
      guardrail.maxChangesPerDay !== undefined &&
      action.changesToday !== undefined &&
      action.changesToday >= guardrail.maxChangesPerDay
    ) {
      violations.push(
        `Daily change limit reached: ${action.changesToday}/${guardrail.maxChangesPerDay} changes used today`,
      );
    }

    // 5. Max financial impact
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

    for (const action of actions) {
      const guardrailType = this.resolveGuardrailType(action.actionType);
      const guardrail = guardrailMap[guardrailType];
      if (guardrail) {
        const result = this.check(action, guardrail);
        if (!result.passed) {
          violations.push(
            ...result.violations.map((v) => `[${action.skuId}] ${v}`),
          );
        }
      }
    }

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

  resolveGuardrailType(actionType: ActionType): string {
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
