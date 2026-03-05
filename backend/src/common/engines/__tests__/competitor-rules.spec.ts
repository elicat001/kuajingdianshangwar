import {
  COMPETITOR_PRICE_DROP_RULE,
  RANK_SURGE_RULE,
} from '../competitor-rules';
import { RuleContext } from '../rule-engine';
import { Severity } from '../../enums';
import {
  makeSkuMetrics,
  makeCompetitorSnapshot,
} from '../../../../test/utils/test-helpers';

describe('Competitor Rules', () => {
  // ─── COMPETITOR_PRICE_DROP ──────────────────────────────────

  describe('COMPETITOR_PRICE_DROP_RULE', () => {
    it('should trigger when competitor price drops > threshold', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ price: 29.99 }),
        thresholds: { competitorPriceDropPct: 5 },
        competitors: [
          makeCompetitorSnapshot({
            prevPrice: 30.0,
            price: 24.0, // 20% drop
          }),
        ],
      };

      expect(COMPETITOR_PRICE_DROP_RULE.condition(ctx)).toBe(true);
    });

    it('should return HIGH severity when drop >= 15%', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: { competitorPriceDropHighPct: 15 },
        competitors: [
          makeCompetitorSnapshot({
            prevPrice: 100,
            price: 80, // 20% drop
          }),
        ],
      };

      expect(COMPETITOR_PRICE_DROP_RULE.severity(ctx)).toBe(Severity.HIGH);
    });

    it('should return MEDIUM severity when drop is between 5% and 15%', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: { competitorPriceDropPct: 5, competitorPriceDropHighPct: 15 },
        competitors: [
          makeCompetitorSnapshot({
            prevPrice: 100,
            price: 92, // 8% drop
          }),
        ],
      };

      expect(COMPETITOR_PRICE_DROP_RULE.severity(ctx)).toBe(Severity.MEDIUM);
    });

    it('should not trigger when drop is below threshold', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: { competitorPriceDropPct: 10 },
        competitors: [
          makeCompetitorSnapshot({
            prevPrice: 100,
            price: 95, // 5% drop, below 10% threshold
          }),
        ],
      };

      expect(COMPETITOR_PRICE_DROP_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger without competitors', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: {},
      };

      expect(COMPETITOR_PRICE_DROP_RULE.condition(ctx)).toBe(false);
    });

    it('should skip competitors with prevPrice <= 0', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: {},
        competitors: [
          makeCompetitorSnapshot({ prevPrice: 0, price: 10 }),
        ],
      };

      expect(COMPETITOR_PRICE_DROP_RULE.condition(ctx)).toBe(false);
    });

    it('should include dropped competitor details in evidence', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ price: 29.99 }),
        thresholds: { competitorPriceDropPct: 5 },
        competitors: [
          makeCompetitorSnapshot({
            competitorAsin: 'C001',
            prevPrice: 30,
            price: 25,
          }),
        ],
      };

      const evidence = COMPETITOR_PRICE_DROP_RULE.buildEvidence(ctx);
      expect(evidence.droppedCompetitors).toHaveLength(1);
      expect(evidence.droppedCompetitors[0].asin).toBe('C001');
      expect(evidence.droppedCompetitors[0].dropPct).toBeCloseTo(16.67, 1);
    });
  });

  // ─── RANK_SURGE ─────────────────────────────────────────────

  describe('RANK_SURGE_RULE', () => {
    it('should trigger when competitor rank improves by >= threshold', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics({ rank: 100 }),
        thresholds: { rankSurgeThreshold: 50 },
        competitors: [
          makeCompetitorSnapshot({
            prevRank: 150,
            rank: 50, // improved by 100 positions
          }),
        ],
      };

      expect(RANK_SURGE_RULE.condition(ctx)).toBe(true);
      expect(RANK_SURGE_RULE.severity(ctx)).toBe(Severity.MEDIUM);
    });

    it('should not trigger when rank improvement is below threshold', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: { rankSurgeThreshold: 50 },
        competitors: [
          makeCompetitorSnapshot({
            prevRank: 80,
            rank: 50, // improved by 30, below 50 threshold
          }),
        ],
      };

      expect(RANK_SURGE_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger when rank is 0 (invalid)', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: { rankSurgeThreshold: 50 },
        competitors: [
          makeCompetitorSnapshot({
            prevRank: 100,
            rank: 0,
          }),
        ],
      };

      expect(RANK_SURGE_RULE.condition(ctx)).toBe(false);
    });

    it('should not trigger without competitors', () => {
      const ctx: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: {},
        competitors: [],
      };

      expect(RANK_SURGE_RULE.condition(ctx)).toBe(false);
    });
  });
});
