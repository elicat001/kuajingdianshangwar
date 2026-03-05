import { AlertType, Severity, ActionType } from '../enums';
import { Rule, RuleContext, SuggestedAction, CompetitorSnapshot } from './rule-engine';

/**
 * COMPETITOR_PRICE_DROP: competitor price drop exceeds threshold% -> MEDIUM/HIGH
 */
export const COMPETITOR_PRICE_DROP_RULE: Rule = {
  id: 'COMPETITOR_PRICE_DROP',
  name: 'Competitor Price Drop Detected',
  type: AlertType.COMPETITOR_PRICE_DROP,
  priority: 2,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    if (!ctx.competitors || ctx.competitors.length === 0) return false;
    const dropThresholdPct = ctx.thresholds['competitorPriceDropPct'] ?? 5;

    return ctx.competitors.some((c) => {
      if (c.prevPrice <= 0) return false;
      const dropPct = ((c.prevPrice - c.price) / c.prevPrice) * 100;
      return dropPct >= dropThresholdPct;
    });
  },

  severity(ctx: RuleContext): Severity {
    const dropThresholdHigh = ctx.thresholds['competitorPriceDropHighPct'] ?? 15;
    const maxDrop = getMaxPriceDrop(ctx.competitors ?? []);
    return maxDrop >= dropThresholdHigh ? Severity.HIGH : Severity.MEDIUM;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const dropThresholdPct = ctx.thresholds['competitorPriceDropPct'] ?? 5;
    const droppedCompetitors = (ctx.competitors ?? [])
      .filter((c) => {
        if (c.prevPrice <= 0) return false;
        const dropPct = ((c.prevPrice - c.price) / c.prevPrice) * 100;
        return dropPct >= dropThresholdPct;
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
      droppedCompetitors,
      threshold: dropThresholdPct,
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    const maxDrop = getMaxPriceDrop(ctx.competitors ?? []);
    const actions: SuggestedAction[] = [];

    if (maxDrop >= 15) {
      // Large drop -> consider matching or defending margin
      actions.push({
        type: ActionType.ADJUST_PRICE,
        label: `Competitor significant price drop (${maxDrop.toFixed(1)}%) - evaluate price match vs margin defense for ${ctx.sku.asin}`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          currentPrice: ctx.sku.price,
          strategy: 'defend_margin_or_match',
          competitorMaxDropPct: maxDrop,
        },
        riskLevel: 'HIGH',
      });
    } else {
      actions.push({
        type: ActionType.ADJUST_PRICE,
        label: `Competitor price drop (${maxDrop.toFixed(1)}%) detected - consider strategic response for ${ctx.sku.asin}`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          currentPrice: ctx.sku.price,
          strategy: 'monitor_or_follow',
          competitorMaxDropPct: maxDrop,
        },
        riskLevel: 'MEDIUM',
      });
    }

    return actions;
  },
};

/**
 * RANK_SURGE: competitor rank surges significantly in a short time -> MEDIUM
 */
export const RANK_SURGE_RULE: Rule = {
  id: 'RANK_SURGE',
  name: 'Competitor Rank Surge',
  type: AlertType.RANK_CHANGE,
  priority: 3,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    if (!ctx.competitors || ctx.competitors.length === 0) return false;
    const rankSurgeThreshold = ctx.thresholds['rankSurgeThreshold'] ?? 50;

    return ctx.competitors.some((c) => {
      // Rank improvement means lower number (e.g. 100 -> 30 is an improvement of 70)
      if (c.prevRank <= 0) return false;
      const rankImprovement = c.prevRank - c.rank;
      return rankImprovement >= rankSurgeThreshold && c.rank > 0;
    });
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.MEDIUM;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const rankSurgeThreshold = ctx.thresholds['rankSurgeThreshold'] ?? 50;
    const surgedCompetitors = (ctx.competitors ?? [])
      .filter((c) => c.prevRank > 0 && c.prevRank - c.rank >= rankSurgeThreshold && c.rank > 0)
      .map((c) => ({
        asin: c.competitorAsin,
        prevRank: c.prevRank,
        currentRank: c.rank,
        rankImprovement: c.prevRank - c.rank,
      }));

    return {
      ownRank: ctx.sku.rank,
      surgedCompetitors,
      threshold: rankSurgeThreshold,
    };
  },

  buildRecommendation(ctx: RuleContext): SuggestedAction[] {
    return [
      {
        type: ActionType.ADJUST_PRICE,
        label: `Competitor rank surge detected - review competitive positioning for ${ctx.sku.asin}`,
        params: {
          skuId: ctx.sku.skuId,
          asin: ctx.sku.asin,
          ownRank: ctx.sku.rank,
          strategy: 'competitive_response',
        },
        riskLevel: 'MEDIUM',
      },
    ];
  },
};

/**
 * REVIEW_ANOMALY: competitor review growth anomaly (daily increase > mean * 3) -> LOW
 */
export const REVIEW_ANOMALY_RULE: Rule = {
  id: 'REVIEW_ANOMALY',
  name: 'Competitor Review Anomaly',
  type: AlertType.REVIEW_ANOMALY,
  priority: 4,
  enabled: true,

  condition(ctx: RuleContext): boolean {
    if (!ctx.competitors || ctx.competitors.length === 0) return false;

    return ctx.competitors.some((c) => {
      if (c.avgDailyReviews <= 0) return false;
      const dailyIncrease = c.reviewCount - c.prevReviewCount;
      return dailyIncrease > c.avgDailyReviews * 3;
    });
  },

  severity(_ctx: RuleContext): Severity {
    return Severity.LOW;
  },

  buildEvidence(ctx: RuleContext): Record<string, any> {
    const anomalous = (ctx.competitors ?? [])
      .filter((c) => {
        if (c.avgDailyReviews <= 0) return false;
        const dailyIncrease = c.reviewCount - c.prevReviewCount;
        return dailyIncrease > c.avgDailyReviews * 3;
      })
      .map((c) => ({
        asin: c.competitorAsin,
        reviewCount: c.reviewCount,
        prevReviewCount: c.prevReviewCount,
        dailyIncrease: c.reviewCount - c.prevReviewCount,
        avgDailyReviews: c.avgDailyReviews,
        multiplier: parseFloat(
          ((c.reviewCount - c.prevReviewCount) / c.avgDailyReviews).toFixed(2),
        ),
      }));

    return { anomalousCompetitors: anomalous };
  },

  buildRecommendation(_ctx: RuleContext): SuggestedAction[] {
    // Review anomalies are informational; no direct automated action
    return [];
  },
};

// ─── Helpers ──────────────────────────────────────────────────

function getMaxPriceDrop(competitors: CompetitorSnapshot[]): number {
  let maxDrop = 0;
  for (const c of competitors) {
    if (c.prevPrice <= 0) continue;
    const dropPct = ((c.prevPrice - c.price) / c.prevPrice) * 100;
    if (dropPct > maxDrop) maxDrop = dropPct;
  }
  return maxDrop;
}

/** All competitor-related rules bundled for convenient registration */
export const COMPETITOR_RULES: Rule[] = [
  COMPETITOR_PRICE_DROP_RULE,
  RANK_SURGE_RULE,
  REVIEW_ANOMALY_RULE,
];
