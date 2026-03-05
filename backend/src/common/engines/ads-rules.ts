import { AlertType, Severity, ActionType } from '../enums';
import { Rule, RuleContext, SuggestedAction } from './rule-engine';
import { calcStdDev, calcMean } from '../utils/metrics-calculator';

/**
 * ADS_WASTE_ZERO_ORDER: spend > threshold and orders == 0 -> HIGH
 */
export const ADS_WASTE_ZERO_ORDER_RULE: Rule = {
  id: 'ADS_WASTE_ZERO_ORDER',
  name: 'Ad Spend With Zero Orders',
  type: AlertType.ADS_WASTE,
  priority: 1,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    const spendThreshold = ctx.thresholds['adsWasteSpendMin'] ?? 50;
    return ctx.sku.adsSpend24h > spendThreshold && ctx.sku.adsOrders24h === 0;
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.HIGH;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    return {
      adsSpend24h: ctx.sku.adsSpend24h,
      adsOrders24h: ctx.sku.adsOrders24h,
      threshold: ctx.thresholds['adsWasteSpendMin'] ?? 50,
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    return [
      {
        type: ActionType.PAUSE_ADGROUP,
        label: `Pause ad group for ${ctx.sku.asin} - $${ctx.sku.adsSpend24h} spent with 0 orders`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          spend: ctx.sku.adsSpend24h,
        },
        riskLevel: 'HIGH',
      },
      {
        type: ActionType.ADD_NEGATIVE_KEYWORD,
        label: `Review search term report and add negative keywords for ${ctx.sku.asin}`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
        },
        riskLevel: 'LOW',
      },
    ];
  },
};

/**
 * ADS_WASTE_HIGH_ACOS: acos > threshold for 3+ consecutive days -> MEDIUM
 */
export const ADS_WASTE_HIGH_ACOS_RULE: Rule = {
  id: 'ADS_WASTE_HIGH_ACOS',
  name: 'Sustained High ACOS',
  type: AlertType.ADS_WASTE,
  priority: 2,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    const acosThreshold = ctx.thresholds['acosHigh'] ?? 40;
    if (!ctx.history || ctx.history.acosDays.length < 3) {
      return false;
    }
    // Check if ACOS exceeded the threshold for the last 3 consecutive days
    const last3 = ctx.history.acosDays.slice(0, 3);
    return last3.every((acos) => acos > acosThreshold);
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.MEDIUM;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const acosThreshold = ctx.thresholds['acosHigh'] ?? 40;
    return {
      acosThreshold,
      acos24h: ctx.sku.acos24h,
      acosLast3Days: ctx.history!.acosDays.slice(0, 3),
      consecutiveDaysAboveThreshold: 3,
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    return [
      {
        type: ActionType.ADJUST_BID,
        label: `Reduce bids for ${ctx.sku.asin} - ACOS above ${ctx.thresholds['acosHigh'] ?? 40}% for 3+ days`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          currentAcos: ctx.sku.acos24h,
          suggestedBidReductionPct: 20,
        },
        riskLevel: 'MEDIUM',
      },
      {
        type: ActionType.ADJUST_BUDGET,
        label: `Consider reducing daily budget for ${ctx.sku.asin}`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          suggestedBudgetReductionPct: 15,
        },
        riskLevel: 'MEDIUM',
      },
    ];
  },
};

/**
 * ACOS_ANOMALY: acos suddenly deviates 2 standard deviations from mean -> HIGH
 */
export const ACOS_ANOMALY_RULE: Rule = {
  id: 'ACOS_ANOMALY',
  name: 'ACOS Anomaly Detected',
  type: AlertType.ACOS_ANOMALY,
  priority: 1,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    if (!ctx.history || ctx.history.acosDays.length < 7) {
      return false;
    }
    // Use historical data (excluding latest day) to compute baseline
    const baseline = ctx.history.acosDays.slice(1);
    const mean = calcMean(baseline);
    const stddev = calcStdDev(baseline);
    if (stddev === 0) return false;

    const latestAcos = ctx.history.acosDays[0];
    return Math.abs(latestAcos - mean) > 2 * stddev;
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.HIGH;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const baseline = ctx.history!.acosDays.slice(1);
    const mean = calcMean(baseline);
    const stddev = calcStdDev(baseline);
    const latestAcos = ctx.history!.acosDays[0];
    return {
      latestAcos,
      mean: parseFloat(mean.toFixed(2)),
      stddev: parseFloat(stddev.toFixed(2)),
      deviationMultiple: parseFloat(
        (Math.abs(latestAcos - mean) / stddev).toFixed(2),
      ),
      direction: latestAcos > mean ? 'SPIKE' : 'DROP',
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    const latestAcos = ctx.history!.acosDays[0];
    const mean = calcMean(ctx.history!.acosDays.slice(1));

    const actions: SuggestedAction[] = [];

    if (latestAcos > mean) {
      // ACOS spiked
      actions.push({
        type: ActionType.PAUSE_ADGROUP,
        label: `ACOS anomaly spike for ${ctx.sku.asin} - consider pausing ad group`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          anomalyType: 'SPIKE',
          latestAcos,
          historicalMean: mean,
        },
        riskLevel: 'HIGH',
      });
      actions.push({
        type: ActionType.ADJUST_BID,
        label: `Lower bids aggressively for ${ctx.sku.asin}`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          suggestedBidReductionPct: 30,
        },
        riskLevel: 'HIGH',
      });
    } else {
      // ACOS dropped (opportunity)
      actions.push({
        type: ActionType.ADJUST_BUDGET,
        label: `ACOS dropped significantly for ${ctx.sku.asin} - consider increasing budget to capture opportunity`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          anomalyType: 'DROP',
          latestAcos,
          historicalMean: mean,
          suggestedBudgetIncreasePct: 20,
        },
        riskLevel: 'MEDIUM',
      });
    }

    return actions;
  },
};

/** All ads-related rules bundled for convenient registration */
export const ADS_RULES: Rule[] = [
  ADS_WASTE_ZERO_ORDER_RULE,
  ADS_WASTE_HIGH_ACOS_RULE,
  ACOS_ANOMALY_RULE,
];
