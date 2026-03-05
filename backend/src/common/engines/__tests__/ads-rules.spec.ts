import {
  ADS_WASTE_ZERO_ORDER_RULE,
  ADS_WASTE_HIGH_ACOS_RULE,
  ACOS_ANOMALY_RULE,
} from '../ads-rules';
import { RuleContext } from '../rule-engine';
import { Severity, ActionType } from '../../enums';
import { makeSkuMetrics } from '../../../../test/utils/test-helpers';

describe('Ads Rules', () => {
  // ─── ADS_WASTE: spend > threshold && orders == 0 ─────────────

  describe('ADS_WASTE_ZERO_ORDER_RULE', () => {
    it('should trigger when spend > threshold and orders == 0', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ adsSpend24h: 100, adsOrders24h: 0 }),
        thresholds: { adsWasteSpendMin: 50 },
      };

      expect(ADS_WASTE_ZERO_ORDER_RULE.condition(ctx)).toBe(true);
      expect(ADS_WASTE_ZERO_ORDER_RULE.severity(ctx)).toBe(Severity.HIGH);
    });

    it('should use default threshold of 50 when not configured', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ adsSpend24h: 60, adsOrders24h: 0 }),
        thresholds: {},
      };

      expect(ADS_WASTE_ZERO_ORDER_RULE.condition(ctx)).toBe(true);
    });

    it('should not trigger when spend is below threshold', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ adsSpend24h: 30, adsOrders24h: 0 }),
        thresholds: { adsWasteSpendMin: 50 },
      };

      expect(ADS_WASTE_ZERO_ORDER_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger when orders > 0', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ adsSpend24h: 100, adsOrders24h: 3 }),
        thresholds: {},
      };

      expect(ADS_WASTE_ZERO_ORDER_RULE.condition(ctx)).toBe(false);
    });

    it('should recommend PAUSE_ADGROUP and ADD_NEGATIVE_KEYWORD', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ adsSpend24h: 200, adsOrders24h: 0, asin: 'B123' }),
        thresholds: {},
      };

      const recs = ADS_WASTE_ZERO_ORDER_RULE.buildRecommendation(ctx);
      expect(recs).toHaveLength(2);
      expect(recs[0].type).toBe(ActionType.PAUSE_ADGROUP);
      expect(recs[1].type).toBe(ActionType.ADD_NEGATIVE_KEYWORD);
    });
  });

  // ─── ACOS sustained high ────────────────────────────────────

  describe('ADS_WASTE_HIGH_ACOS_RULE', () => {
    it('should trigger when ACOS > threshold for 3+ consecutive days', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ acos24h: 55 }),
        thresholds: { acosHigh: 40 },
        history: {
          acosDays: [55, 50, 45, 30, 25, 20, 15], // first 3 all > 40
          salesDays: [],
          spendDays: [],
          rankDays: [],
        },
      };

      expect(ADS_WASTE_HIGH_ACOS_RULE.condition(ctx)).toBe(true);
      expect(ADS_WASTE_HIGH_ACOS_RULE.severity(ctx)).toBe(Severity.MEDIUM);
    });

    it('should not trigger without history', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ acos24h: 55 }),
        thresholds: {},
      };

      expect(ADS_WASTE_HIGH_ACOS_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger when only 2 days exceed threshold', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: { acosHigh: 40 },
        history: {
          acosDays: [50, 45, 30], // only first 2 > 40
          salesDays: [],
          spendDays: [],
          rankDays: [],
        },
      };

      expect(ADS_WASTE_HIGH_ACOS_RULE.condition(ctx)).toBe(false);
    });
  });

  // ─── ACOS Anomaly ───────────────────────────────────────────

  describe('ACOS_ANOMALY_RULE', () => {
    it('should trigger when latest ACOS deviates > 2 std devs', () => {
      // Baseline: [20, 22, 18, 21, 19, 20] mean ~20, stddev ~1.3
      // Latest: 50 -> deviation = (50-20)/1.3 >> 2
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ acos24h: 50 }),
        thresholds: {},
        history: {
          acosDays: [50, 20, 22, 18, 21, 19, 20],
          salesDays: [],
          spendDays: [],
          rankDays: [],
        },
      };

      expect(ACOS_ANOMALY_RULE.condition(ctx)).toBe(true);
      expect(ACOS_ANOMALY_RULE.severity(ctx)).toBe(Severity.HIGH);
    });

    it('should not trigger with insufficient history', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: {},
        history: {
          acosDays: [50, 20, 22], // only 3 days, need 7
          salesDays: [],
          spendDays: [],
          rankDays: [],
        },
      };

      expect(ACOS_ANOMALY_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger with normal ACOS variation', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: {},
        history: {
          acosDays: [21, 20, 22, 18, 21, 19, 20], // normal variation
          salesDays: [],
          spendDays: [],
          rankDays: [],
        },
      };

      expect(ACOS_ANOMALY_RULE.condition(ctx)).toBe(false);
    });

    it('should detect spike direction in evidence', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: {},
        history: {
          acosDays: [50, 20, 22, 18, 21, 19, 20],
          salesDays: [],
          spendDays: [],
          rankDays: [],
        },
      };

      const evidence = ACOS_ANOMALY_RULE.buildEvidence(ctx);
      expect(evidence.direction).toBe('SPIKE');
    });
  });

  // ─── Normal spending -> no trigger ──────────────────────────

  describe('Normal ad spend', () => {
    it('should not trigger any ad rules with normal metrics', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({
          adsSpend24h: 30,
          adsOrders24h: 5,
          acos24h: 20,
        }),
        thresholds: {},
      };

      expect(ADS_WASTE_ZERO_ORDER_RULE.condition(ctx)).toBe(false);
      expect(ADS_WASTE_HIGH_ACOS_RULE.condition(ctx)).toBe(false);
      expect(ACOS_ANOMALY_RULE.condition(ctx)).toBe(false);
    });
  });
});
