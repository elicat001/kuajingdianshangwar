import { AlertType, Severity, ActionType, ActionStatus, RecommendationStatus, RiskLevel } from '../enums';

// ─── Interfaces ───────────────────────────────────────────────

export interface SkuMetrics {
  skuId: string;
  asin: string;
  storeId: string;
  siteId: string;
  available: number;
  avgDailyUnits7d: number;
  daysOfCover: number;
  sales24h: number;
  salesPrev24h: number;
  adsSpend24h: number;
  adsOrders24h: number;
  acos24h: number;
  tacos24h: number;
  price: number;
  prevPrice: number;
  rank: number;
  prevRank: number;
}

export interface CompetitorSnapshot {
  competitorAsin: string;
  price: number;
  prevPrice: number;
  rank: number;
  prevRank: number;
  reviewCount: number;
  prevReviewCount: number;
  avgDailyReviews: number;
  rating: number;
}

export interface MetricHistory {
  /** Daily ACOS values, most recent first */
  acosDays: number[];
  /** Daily sales values, most recent first */
  salesDays: number[];
  /** Daily spend values, most recent first */
  spendDays: number[];
  /** Daily rank values, most recent first */
  rankDays: number[];
}

export interface RuleContext {
  sku: SkuMetrics;
  thresholds: Record<string, number>;
  competitors?: CompetitorSnapshot[];
  history?: MetricHistory;
}

export interface SuggestedAction {
  type: ActionType;
  label: string;
  params: Record<string, any>;
  riskLevel: RiskLevel | string;
}

export interface Rule {
  id: string;
  name: string;
  type: AlertType;
  priority: number;
  enabled: boolean;
  condition: (context: RuleContext) => boolean;
  severity: (context: RuleContext) => Severity;
  buildEvidence: (context: RuleContext) => Record<string, any>;
  buildRecommendation: (context: RuleContext) => SuggestedAction[];
}

export interface AlertResult {
  ruleId: string;
  ruleName: string;
  type: AlertType;
  severity: Severity;
  skuId: string;
  asin: string;
  storeId: string;
  siteId: string;
  evidence: Record<string, any>;
  recommendations: SuggestedAction[];
  triggeredAt: Date;
}

export interface EvaluationResult {
  alerts: AlertResult[];
  rulesEvaluated: number;
  rulesTriggered: number;
}

// ─── Rule Engine ──────────────────────────────────────────────

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();

  /**
   * Register a rule into the engine.
   * If a rule with the same id already exists it will be overwritten.
   */
  registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Unregister a rule by id.
   */
  unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Enable or disable a rule at runtime.
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Evaluate all enabled rules against the provided context.
   * Rules are evaluated in priority order (lower number = higher priority).
   * Returns triggered alerts and recommendations.
   */
  evaluate(context: RuleContext): EvaluationResult {
    const sortedRules = Array.from(this.rules.values())
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    const alerts: AlertResult[] = [];

    for (const rule of sortedRules) {
      try {
        if (rule.condition(context)) {
          const severity = rule.severity(context);
          const evidence = rule.buildEvidence(context);
          const recommendations = rule.buildRecommendation(context);

          alerts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: rule.type,
            severity,
            skuId: context.sku.skuId,
            asin: context.sku.asin,
            storeId: context.sku.storeId,
            siteId: context.sku.siteId,
            evidence,
            recommendations,
            triggeredAt: new Date(),
          });
        }
      } catch (error) {
        // Log rule evaluation errors but continue evaluating remaining rules.
        console.error(
          `[RuleEngine] Failed to evaluate rule "${rule.id}" (${rule.name}):`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return {
      alerts,
      rulesEvaluated: sortedRules.length,
      rulesTriggered: alerts.length,
    };
  }

  /**
   * Return all registered rule ids.
   */
  listRules(): { id: string; name: string; enabled: boolean; priority: number }[] {
    return Array.from(this.rules.values()).map((r) => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      priority: r.priority,
    }));
  }
}
