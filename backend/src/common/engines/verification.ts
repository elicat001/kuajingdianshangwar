import { ActionType } from '../enums';

// ─── Interfaces ───────────────────────────────────────────────

export interface MetricsSnapshot {
  /** Price at snapshot time */
  price: number;
  /** 24h sales revenue */
  sales24h: number;
  /** 24h units sold */
  units24h: number;
  /** Current BSR rank */
  rank: number;
  /** Ad spend in 24h */
  adsSpend24h: number;
  /** Ad orders in 24h */
  adsOrders24h: number;
  /** ACOS percentage */
  acos: number;
  /** TACOS percentage */
  tacos: number;
  /** Available inventory */
  available: number;
  /** Timestamp of snapshot */
  snapshotAt: Date;
}

export interface VerificationInput {
  actionId: string;
  actionType: ActionType;
  skuId: string;
  /** The intended change (e.g., new price, new bid amount) */
  intendedValue: number;
  /** Metrics captured before execution */
  beforeMetrics: MetricsSnapshot;
  /** Metrics captured after execution (after settling period) */
  afterMetrics: MetricsSnapshot;
}

export interface SideEffect {
  metric: string;
  before: number;
  after: number;
  changePct: number;
  direction: 'IMPROVED' | 'DEGRADED' | 'NEUTRAL';
}

export interface VerificationResult {
  actionId: string;
  skuId: string;
  /** Net gain from the action (positive = beneficial) */
  gain: number;
  /** Net loss from the action (positive = detrimental) */
  loss: number;
  /** Overall impact score: gain - loss */
  netImpact: number;
  /** Side effects observed */
  sideEffects: SideEffect[];
  /** Whether automatic rollback is recommended */
  recommendRollback: boolean;
  /** Human-readable reason for the recommendation */
  reason: string;
  /** Verification timestamp */
  verifiedAt: Date;
}

// ─── Metric Direction Config ──────────────────────────────────
// Defines whether an increase in a metric is "good" or "bad".

type MetricDirection = 'higher_is_better' | 'lower_is_better';

const METRIC_DIRECTIONS: Record<string, MetricDirection> = {
  sales24h: 'higher_is_better',
  units24h: 'higher_is_better',
  rank: 'lower_is_better', // lower rank number = better
  acos: 'lower_is_better',
  tacos: 'lower_is_better',
  adsSpend24h: 'lower_is_better',
  adsOrders24h: 'higher_is_better',
};

// ─── VerificationEngine ───────────────────────────────────────

export class VerificationEngine {
  /** Threshold for recommending rollback: net impact below this triggers rollback */
  private rollbackThreshold: number;
  /** Threshold for side-effect significance (percentage change) */
  private sideEffectThresholdPct: number;

  constructor(rollbackThreshold = -15, sideEffectThresholdPct = 5) {
    this.rollbackThreshold = rollbackThreshold;
    this.sideEffectThresholdPct = sideEffectThresholdPct;
  }

  /**
   * Verify the outcome of an executed action by comparing before/after metrics.
   */
  verify(input: VerificationInput): VerificationResult {
    const { beforeMetrics, afterMetrics } = input;

    const sideEffects = this.detectSideEffects(beforeMetrics, afterMetrics);

    const { gain, loss } = this.calculateGainLoss(
      input.actionType,
      beforeMetrics,
      afterMetrics,
    );

    const netImpact = gain - loss;

    const { recommendRollback, reason } = this.evaluateRollback(
      input.actionType,
      netImpact,
      sideEffects,
      beforeMetrics,
      afterMetrics,
    );

    return {
      actionId: input.actionId,
      skuId: input.skuId,
      gain: parseFloat(gain.toFixed(2)),
      loss: parseFloat(loss.toFixed(2)),
      netImpact: parseFloat(netImpact.toFixed(2)),
      sideEffects,
      recommendRollback,
      reason,
      verifiedAt: new Date(),
    };
  }

  /**
   * Detect significant side effects across all tracked metrics.
   */
  private detectSideEffects(
    before: MetricsSnapshot,
    after: MetricsSnapshot,
  ): SideEffect[] {
    const effects: SideEffect[] = [];
    const metricsToCheck: (keyof MetricsSnapshot)[] = [
      'sales24h',
      'units24h',
      'rank',
      'acos',
      'tacos',
      'adsSpend24h',
      'adsOrders24h',
    ];

    for (const metric of metricsToCheck) {
      const beforeVal = before[metric] as number;
      const afterVal = after[metric] as number;

      if (beforeVal === 0 && afterVal === 0) continue;

      const changePct =
        beforeVal !== 0
          ? ((afterVal - beforeVal) / Math.abs(beforeVal)) * 100
          : afterVal > 0
            ? 100
            : 0;

      if (Math.abs(changePct) < this.sideEffectThresholdPct) continue;

      const direction = METRIC_DIRECTIONS[metric];
      let assessment: 'IMPROVED' | 'DEGRADED' | 'NEUTRAL' = 'NEUTRAL';

      if (direction === 'higher_is_better') {
        assessment = afterVal > beforeVal ? 'IMPROVED' : 'DEGRADED';
      } else if (direction === 'lower_is_better') {
        assessment = afterVal < beforeVal ? 'IMPROVED' : 'DEGRADED';
      }

      effects.push({
        metric: metric as string,
        before: beforeVal,
        after: afterVal,
        changePct: parseFloat(changePct.toFixed(2)),
        direction: assessment,
      });
    }

    return effects;
  }

  /**
   * Calculate gain and loss based on the action type.
   */
  private calculateGainLoss(
    actionType: ActionType,
    before: MetricsSnapshot,
    after: MetricsSnapshot,
  ): { gain: number; loss: number } {
    let gain = 0;
    let loss = 0;

    switch (actionType) {
      case ActionType.ADJUST_PRICE: {
        // Gain: increased sales revenue
        const salesDelta = after.sales24h - before.sales24h;
        if (salesDelta > 0) gain += salesDelta;
        else loss += Math.abs(salesDelta);

        // Loss from rank degradation
        if (after.rank > before.rank) {
          const rankDegradation = ((after.rank - before.rank) / before.rank) * 10;
          loss += rankDegradation;
        } else if (after.rank < before.rank) {
          const rankImprovement = ((before.rank - after.rank) / before.rank) * 10;
          gain += rankImprovement;
        }
        break;
      }

      case ActionType.ADJUST_BID:
      case ActionType.ADJUST_BUDGET:
      case ActionType.PAUSE_ADGROUP: {
        // Gain: reduced spend with maintained/improved orders
        const spendDelta = before.adsSpend24h - after.adsSpend24h;
        if (spendDelta > 0) gain += spendDelta; // saved spend
        else loss += Math.abs(spendDelta); // increased spend

        const ordersDelta = after.adsOrders24h - before.adsOrders24h;
        if (ordersDelta > 0) gain += ordersDelta * (after.sales24h / Math.max(after.units24h, 1));
        else if (ordersDelta < 0) loss += Math.abs(ordersDelta) * (before.sales24h / Math.max(before.units24h, 1));
        break;
      }

      default: {
        // Generic: compare sales revenue
        const salesDelta = after.sales24h - before.sales24h;
        if (salesDelta > 0) gain += salesDelta;
        else loss += Math.abs(salesDelta);
        break;
      }
    }

    return { gain, loss };
  }

  /**
   * Evaluate whether rollback should be recommended.
   */
  private evaluateRollback(
    actionType: ActionType,
    netImpact: number,
    sideEffects: SideEffect[],
    before: MetricsSnapshot,
    after: MetricsSnapshot,
  ): { recommendRollback: boolean; reason: string } {
    const degradedEffects = sideEffects.filter(
      (e) => e.direction === 'DEGRADED',
    );

    // Critical: net impact below rollback threshold
    if (netImpact < this.rollbackThreshold) {
      return {
        recommendRollback: true,
        reason: `Net impact ${netImpact.toFixed(2)} is below rollback threshold ${this.rollbackThreshold}. Degraded metrics: ${degradedEffects.map((e) => `${e.metric}(${e.changePct}%)`).join(', ') || 'none'}.`,
      };
    }

    // Critical: rank dropped by more than 50% (for price actions)
    if (
      actionType === ActionType.ADJUST_PRICE &&
      before.rank > 0 &&
      after.rank > before.rank * 1.5
    ) {
      return {
        recommendRollback: true,
        reason: `Rank degraded significantly from ${before.rank} to ${after.rank} (>${50}% worse) after price change.`,
      };
    }

    // Critical: sales dropped by more than 40%
    if (
      before.sales24h > 0 &&
      after.sales24h < before.sales24h * 0.6
    ) {
      return {
        recommendRollback: true,
        reason: `Sales dropped ${(((before.sales24h - after.sales24h) / before.sales24h) * 100).toFixed(1)}% (from $${before.sales24h} to $${after.sales24h}).`,
      };
    }

    // Multiple degraded metrics (3+)
    if (degradedEffects.length >= 3) {
      return {
        recommendRollback: true,
        reason: `${degradedEffects.length} metrics degraded: ${degradedEffects.map((e) => `${e.metric}(${e.changePct}%)`).join(', ')}.`,
      };
    }

    // No rollback needed
    if (netImpact >= 0) {
      return {
        recommendRollback: false,
        reason: `Action produced positive net impact of ${netImpact.toFixed(2)}. ${sideEffects.filter((e) => e.direction === 'IMPROVED').length} metrics improved.`,
      };
    }

    return {
      recommendRollback: false,
      reason: `Net impact ${netImpact.toFixed(2)} is negative but above rollback threshold. Monitoring recommended.`,
    };
  }
}
