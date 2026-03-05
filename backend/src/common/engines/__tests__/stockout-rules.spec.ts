import {
  STOCKOUT_HIGH_RULE,
  STOCKOUT_MED_RULE,
  SLOW_MOVING_RULE,
} from '../stockout-rules';
import { RuleContext } from '../rule-engine';
import { Severity, ActionType } from '../../enums';
import { makeSkuMetrics } from '../../../../test/utils/test-helpers';

describe('Stockout Rules', () => {
  // ─── STOCKOUT_HIGH: daysOfCover < 3 ─────────────────────────

  describe('STOCKOUT_HIGH_RULE', () => {
    it('should trigger when daysOfCover < 3 and sales > 0', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 2, avgDailyUnits7d: 10, available: 20 }),
        thresholds: {},
      };

      expect(STOCKOUT_HIGH_RULE.condition(ctx)).toBe(true);
      expect(STOCKOUT_HIGH_RULE.severity(ctx)).toBe(Severity.HIGH);
    });

    it('should not trigger when daysOfCover >= 3', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 5, avgDailyUnits7d: 10 }),
        thresholds: {},
      };

      expect(STOCKOUT_HIGH_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger when avgDailyUnits7d is 0', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 1, avgDailyUnits7d: 0 }),
        thresholds: {},
      };

      expect(STOCKOUT_HIGH_RULE.condition(ctx)).toBe(false);
    });

    it('should recommend CREATE_REORDER with correct quantity', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 1, avgDailyUnits7d: 10, available: 10, asin: 'B123' }),
        thresholds: {},
      };

      const recs = STOCKOUT_HIGH_RULE.buildRecommendation(ctx);
      expect(recs).toHaveLength(1);
      expect(recs[0].type).toBe(ActionType.CREATE_REORDER);
      expect(recs[0].params.suggestedQty).toBe(300); // 10 * 30
    });
  });

  // ─── STOCKOUT_MED: 3 <= daysOfCover < 7 ─────────────────────

  describe('STOCKOUT_MED_RULE', () => {
    it('should trigger when daysOfCover is between 3 and 7', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 5, avgDailyUnits7d: 8 }),
        thresholds: {},
      };

      expect(STOCKOUT_MED_RULE.condition(ctx)).toBe(true);
      expect(STOCKOUT_MED_RULE.severity(ctx)).toBe(Severity.MEDIUM);
    });

    it('should not trigger when daysOfCover < 3 (handled by HIGH)', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 2, avgDailyUnits7d: 8 }),
        thresholds: {},
      };

      expect(STOCKOUT_MED_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger when daysOfCover >= 7', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 10, avgDailyUnits7d: 8 }),
        thresholds: {},
      };

      expect(STOCKOUT_MED_RULE.condition(ctx)).toBe(false);
    });
  });

  // ─── SLOW_MOVING: daysOfCover > 90 + declining trend ────────

  describe('SLOW_MOVING_RULE', () => {
    it('should trigger when daysOfCover > 90 and sales declining (simple)', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({
          daysOfCover: 120,
          sales24h: 10,
          salesPrev24h: 20,
        }),
        thresholds: {},
      };

      expect(SLOW_MOVING_RULE.condition(ctx)).toBe(true);
      expect(SLOW_MOVING_RULE.severity(ctx)).toBe(Severity.MEDIUM);
    });

    it('should trigger with history-based declining trend', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 120 }),
        thresholds: {},
        history: {
          acosDays: [],
          salesDays: [5, 6, 4, 20, 22, 18, 25], // recent avg ~5, older avg ~21
          spendDays: [],
          rankDays: [],
        },
      };

      expect(SLOW_MOVING_RULE.condition(ctx)).toBe(true);
    });

    it('should not trigger when daysOfCover <= 90', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 80, sales24h: 5, salesPrev24h: 10 }),
        thresholds: {},
      };

      expect(SLOW_MOVING_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger when sales not declining', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({
          daysOfCover: 120,
          sales24h: 30,
          salesPrev24h: 20,
        }),
        thresholds: {},
      };

      expect(SLOW_MOVING_RULE.condition(ctx)).toBe(false);
    });

    it('should recommend ADJUST_PRICE for clearance', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 150, sales24h: 5, salesPrev24h: 20, asin: 'B999' }),
        thresholds: {},
      };

      const recs = SLOW_MOVING_RULE.buildRecommendation(ctx);
      expect(recs).toHaveLength(1);
      expect(recs[0].type).toBe(ActionType.ADJUST_PRICE);
      expect(recs[0].params.reason).toBe('slow_moving_clearance');
    });
  });
});
