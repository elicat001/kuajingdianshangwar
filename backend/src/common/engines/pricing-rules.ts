import { AlertType, Severity, ActionType } from '../enums';
import { Rule, RuleContext, SuggestedAction, CompetitorSnapshot } from './rule-engine';

/**
 * MARGIN_BELOW_FLOOR: current price leads to margin below the floor -> CRITICAL
 */
export const MARGIN_BELOW_FLOOR_RULE: Rule = {
  id: 'MARGIN_BELOW_FLOOR',
  name: 'Margin Below Floor',
  type: AlertType.COMPETITOR_PRICE_DROP, // pricing alert, reusing closest enum
  priority: 0, // highest priority
  enabled: true,

  condition(ctx: RuleContext): boolean {
    const costPerUnit = ctx.thresholds['costPerUnit'] ?? 0;
    const feePerUnit = ctx.thresholds['feePerUnit'] ?? 0;
    const marginFloorPct = ctx.thresholds['marginFloorPct'] ?? 10;

    if (costPerUnit <= 0) return false;

    const totalCost = costPerUnit + feePerUnit;
    const margin = ((ctx.sku.price - totalCost) / ctx.sku.price) * 100;
    return margin < marginFloorPct;
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.CRITICAL;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const costPerUnit = ctx.thresholds['costPerUnit'] ?? 0;
    const feePerUnit = ctx.thresholds['feePerUnit'] ?? 0;
    const marginFloorPct = ctx.thresholds['marginFloorPct'] ?? 10;
    const totalCost = costPerUnit + feePerUnit;
    const margin = ctx.sku.price > 0
      ? ((ctx.sku.price - totalCost) / ctx.sku.price) * 100
      : 0;

    return {
      currentPrice: ctx.sku.price,
      costPerUnit,
      feePerUnit,
      totalCost,
      currentMarginPct: parseFloat(margin.toFixed(2)),
      marginFloorPct,
      deficit: parseFloat((marginFloorPct - margin).toFixed(2)),
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    const costPerUnit = ctx.thresholds['costPerUnit'] ?? 0;
    const feePerUnit = ctx.thresholds['feePerUnit'] ?? 0;
    const marginFloorPct = ctx.thresholds['marginFloorPct'] ?? 10;
    const totalCost = costPerUnit + feePerUnit;
    // Calculate the minimum price to restore margin floor
    const minPrice = totalCost / (1 - marginFloorPct / 100);

    return [
      {
        type: ActionType.ADJUST_PRICE,
        label: `Raise price for ${ctx.sku.asin} to restore margin above ${marginFloorPct}% floor`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          currentPrice: ctx.sku.price,
          suggestedPrice: parseFloat(minPrice.toFixed(2)),
          strategy: 'defend_margin',
        },
        riskLevel: 'CRITICAL',
      },
    ];
  },
};

/**
 * PRICE_WAR_DETECTED: multiple competitors drop prices simultaneously -> HIGH
 */
export const PRICE_WAR_DETECTED_RULE: Rule = {
  id: 'PRICE_WAR_DETECTED',
  name: 'Price War Detected',
  type: AlertType.COMPETITOR_PRICE_DROP,
  priority: 1,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    if (!ctx.competitors || ctx.competitors.length < 2) return false;
    const dropThresholdPct = ctx.thresholds['priceWarDropPct'] ?? 3;
    const minDropCount = ctx.thresholds['priceWarMinDropCount'] ?? 2;

    const droppedCount = ctx.competitors.filter((c) => {
      if (c.prevPrice <= 0) return false;
      const dropPct = ((c.prevPrice - c.price) / c.prevPrice) * 100;
      return dropPct >= dropThresholdPct;
    }).length;

    return droppedCount >= minDropCount;
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.HIGH;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const dropThresholdPct = ctx.thresholds['priceWarDropPct'] ?? 3;
    const dropped = (ctx.competitors ?? [])
      .filter((c) => {
        if (c.prevPrice <= 0) return false;
        return ((c.prevPrice - c.price) / c.prevPrice) * 100 >= dropThresholdPct;
      })
      .map((c) => ({
        asin: c.competitorAsin,
        prevPrice: c.prevPrice,
        currentPrice: c.price,
        dropPct: parseFloat(
          (((c.prevPrice - c.price) / c.prevPrice) * 100).toFixed(2),
        ),
      }));

    return {
      ownPrice: ctx.sku.price,
      droppedCompetitors: dropped,
      totalDropped: dropped.length,
      totalCompetitors: ctx.competitors?.length ?? 0,
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    const strategies = buildPricingStrategies(ctx);
    return strategies;
  },
};

// ─── Strategy Builder ─────────────────────────────────────────

interface PricingStrategy {
  name: string;
  description: string;
  suggestedPriceMultiplier: number;
  riskLevel: string;
}

const PRICING_STRATEGIES: PricingStrategy[] = [
  {
    name: 'defend_margin',
    description: 'Hold current price, focus on value differentiation',
    suggestedPriceMultiplier: 1.0,
    riskLevel: 'LOW',
  },
  {
    name: 'grab_position',
    description: 'Aggressive price cut to seize rank position',
    suggestedPriceMultiplier: 0.9,
    riskLevel: 'HIGH',
  },
  {
    name: 'flash_follow',
    description: 'Match the lowest competitor price temporarily',
    suggestedPriceMultiplier: 0.95,
    riskLevel: 'MEDIUM',
  },
  {
    name: 'clearance',
    description: 'Deep discount for inventory clearance',
    suggestedPriceMultiplier: 0.8,
    riskLevel: 'HIGH',
  },
];

function buildPricingStrategies(ctx: RuleContext): SuggestedAction[] {
  const lowestCompetitorPrice = Math.min(
    ...(ctx.competitors ?? []).map((c) => c.price).filter((p) => p > 0),
  );

  return PRICING_STRATEGIES.map((strategy) => ({
    type: ActionType.ADJUST_PRICE,
    label: `[${strategy.name}] ${strategy.description} for ${ctx.sku.asin}`,
    params: {
      skuId: ctx.sku.skuId,
      asin: ctx.sku.asin,
      currentPrice: ctx.sku.price,
      lowestCompetitorPrice,
      strategy: strategy.name,
      suggestedPrice: parseFloat(
        (ctx.sku.price * strategy.suggestedPriceMultiplier).toFixed(2),
      ),
    },
    riskLevel: strategy.riskLevel,
  }));
}

/** All pricing-related rules bundled for convenient registration */
export const PRICING_RULES: Rule[] = [
  MARGIN_BELOW_FLOOR_RULE,
  PRICE_WAR_DETECTED_RULE,
];
