import { AlertType, Severity, ActionType } from '../enums';
import { Rule, RuleContext, SuggestedAction } from './rule-engine';

/**
 * STOCKOUT_HIGH: daysOfCover < 3 and avgDailyUnits7d > 0 -> HIGH
 */
export const STOCKOUT_HIGH_RULE: Rule = {
  id: 'STOCKOUT_HIGH',
  name: 'Critical Stockout Risk (< 3 days cover)',
  type: AlertType.STOCKOUT,
  priority: 1,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    return ctx.sku.daysOfCover < 3 && ctx.sku.avgDailyUnits7d > 0;
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.HIGH;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    return {
      daysOfCover: ctx.sku.daysOfCover,
      available: ctx.sku.available,
      avgDailyUnits7d: ctx.sku.avgDailyUnits7d,
      estimatedStockoutDate: new Date(
        Date.now() + ctx.sku.daysOfCover * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    return [
      {
        type: ActionType.CREATE_REORDER,
        label: `Urgent reorder for ${ctx.sku.asin} - only ${ctx.sku.daysOfCover} days of stock remaining`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          currentStock: ctx.sku.available,
          avgDailyUnits7d: ctx.sku.avgDailyUnits7d,
          suggestedQty: Math.ceil(ctx.sku.avgDailyUnits7d * 30),
        },
        riskLevel: 'HIGH',
      },
    ];
  },
};

/**
 * STOCKOUT_MED: daysOfCover < 7 and avgDailyUnits7d > 0 -> MEDIUM
 */
export const STOCKOUT_MED_RULE: Rule = {
  id: 'STOCKOUT_MED',
  name: 'Stockout Warning (< 7 days cover)',
  type: AlertType.STOCKOUT,
  priority: 2,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    return ctx.sku.daysOfCover >= 3 && ctx.sku.daysOfCover < 7 && ctx.sku.avgDailyUnits7d > 0;
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.MEDIUM;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    return {
      daysOfCover: ctx.sku.daysOfCover,
      available: ctx.sku.available,
      avgDailyUnits7d: ctx.sku.avgDailyUnits7d,
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    return [
      {
        type: ActionType.CREATE_REORDER,
        label: `Plan reorder for ${ctx.sku.asin} - ${ctx.sku.daysOfCover} days of stock remaining`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          currentStock: ctx.sku.available,
          avgDailyUnits7d: ctx.sku.avgDailyUnits7d,
          suggestedQty: Math.ceil(ctx.sku.avgDailyUnits7d * 45),
        },
        riskLevel: 'MEDIUM',
      },
    ];
  },
};

/**
 * SLOW_MOVING: daysOfCover > 90 and sales trending down -> MEDIUM
 */
export const SLOW_MOVING_RULE: Rule = {
  id: 'SLOW_MOVING',
  name: 'Slow Moving Inventory (> 90 days cover, declining sales)',
  type: AlertType.SLOW_MOVING,
  priority: 5,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    if (ctx.sku.daysOfCover <= 90) return false;
    // Check sales trend: current 24h sales lower than previous 24h
    const salesDecline = ctx.sku.sales24h < ctx.sku.salesPrev24h;
    // Also check history if available
    if (ctx.history && ctx.history.salesDays.length >= 7) {
      const recentAvg =
        ctx.history.salesDays.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
      const olderAvg =
        ctx.history.salesDays.slice(3, 7).reduce((s, v) => s + v, 0) /
        Math.min(4, ctx.history.salesDays.length - 3);
      return recentAvg < olderAvg * 0.8; // 20%+ decline
    }
    return salesDecline;
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.MEDIUM;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const evidence: Record<string, any> = {
      daysOfCover: ctx.sku.daysOfCover,
      available: ctx.sku.available,
      sales24h: ctx.sku.sales24h,
      salesPrev24h: ctx.sku.salesPrev24h,
    };
    if (ctx.history && ctx.history.salesDays.length >= 7) {
      const recentAvg =
        ctx.history.salesDays.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
      const olderAvg =
        ctx.history.salesDays.slice(3, 7).reduce((s, v) => s + v, 0) /
        Math.min(4, ctx.history.salesDays.length - 3);
      evidence.recentAvgSales = recentAvg;
      evidence.olderAvgSales = olderAvg;
      evidence.declinePct = olderAvg > 0 ? ((olderAvg - recentAvg) / olderAvg) * 100 : 0;
    }
    return evidence;
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    return [
      {
        type: ActionType.ADJUST_PRICE,
        label: `Consider clearance pricing for slow-moving ${ctx.sku.asin}`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          currentPrice: ctx.sku.price,
          suggestedDiscountPct: 15,
          reason: 'slow_moving_clearance',
        },
        riskLevel: 'MEDIUM',
      },
    ];
  },
};

/** All stockout-related rules bundled for convenient registration */
export const STOCKOUT_RULES: Rule[] = [
  STOCKOUT_HIGH_RULE,
  STOCKOUT_MED_RULE,
  SLOW_MOVING_RULE,
];
