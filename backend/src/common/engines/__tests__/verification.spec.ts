import {
  VerificationEngine,
  VerificationInput,
} from '../verification';
import { ActionType } from '../../enums';
import { makeMetricsSnapshot } from '../../../../test/utils/test-helpers';

describe('VerificationEngine', () => {
  let engine: VerificationEngine;

  beforeEach(() => {
    engine = new VerificationEngine(-15, 5);
  });

  // ─── Metrics Improved ───────────────────────────────────────

  describe('metrics improved', () => {
    it('should report gain > 0 and recommendRollback = false when sales increase', () => {
      const input: VerificationInput = {
        actionId: 'action-1',
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        intendedValue: 24.99,
        beforeMetrics: makeMetricsSnapshot({
          price: 29.99,
          sales24h: 500,
          units24h: 20,
          rank: 100,
        }),
        afterMetrics: makeMetricsSnapshot({
          price: 24.99,
          sales24h: 800, // increased
          units24h: 35,
          rank: 80, // improved (lower)
        }),
      };

      const result = engine.verify(input);

      expect(result.gain).toBeGreaterThan(0);
      expect(result.netImpact).toBeGreaterThan(0);
      expect(result.recommendRollback).toBe(false);
      expect(result.reason).toContain('positive');
    });
  });

  // ─── Metrics Degraded ──────────────────────────────────────

  describe('metrics degraded', () => {
    it('should report loss > 0 and recommendRollback = true when sales drop > 40%', () => {
      const input: VerificationInput = {
        actionId: 'action-2',
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        intendedValue: 39.99,
        beforeMetrics: makeMetricsSnapshot({
          price: 29.99,
          sales24h: 500,
          units24h: 20,
          rank: 100,
        }),
        afterMetrics: makeMetricsSnapshot({
          price: 39.99,
          sales24h: 150, // dropped 70%
          units24h: 5,
          rank: 200, // degraded
        }),
      };

      const result = engine.verify(input);

      expect(result.loss).toBeGreaterThan(0);
      expect(result.recommendRollback).toBe(true);
    });

    it('should recommend rollback when net impact < rollback threshold', () => {
      const input: VerificationInput = {
        actionId: 'action-3',
        actionType: ActionType.ADJUST_BID,
        skuId: 'sku-1',
        intendedValue: 5,
        beforeMetrics: makeMetricsSnapshot({
          adsSpend24h: 100,
          adsOrders24h: 10,
          sales24h: 500,
          units24h: 20,
        }),
        afterMetrics: makeMetricsSnapshot({
          adsSpend24h: 120, // increased
          adsOrders24h: 2, // dropped significantly
          sales24h: 200,
          units24h: 8,
        }),
      };

      const result = engine.verify(input);

      // Large drop in orders should cause significant loss
      expect(result.recommendRollback).toBe(true);
    });

    it('should recommend rollback when rank degrades > 50%', () => {
      const input: VerificationInput = {
        actionId: 'action-4',
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        intendedValue: 45.99,
        beforeMetrics: makeMetricsSnapshot({
          price: 29.99,
          sales24h: 500,
          units24h: 20,
          rank: 50,
        }),
        afterMetrics: makeMetricsSnapshot({
          price: 45.99,
          sales24h: 480, // slight decrease (within threshold)
          units24h: 19,
          rank: 120, // 140% of original -> > 50% worse
        }),
      };

      const result = engine.verify(input);

      expect(result.recommendRollback).toBe(true);
      expect(result.reason).toContain('rank');
    });
  });

  // ─── Flat / No Change ──────────────────────────────────────

  describe('metrics flat', () => {
    it('should not recommend rollback when metrics are stable', () => {
      const snapshot = makeMetricsSnapshot({
        price: 29.99,
        sales24h: 500,
        units24h: 20,
        rank: 100,
        adsSpend24h: 50,
        adsOrders24h: 5,
        acos: 25,
        tacos: 10,
      });

      const input: VerificationInput = {
        actionId: 'action-5',
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        intendedValue: 29.99,
        beforeMetrics: snapshot,
        afterMetrics: { ...snapshot, snapshotAt: new Date() },
      };

      const result = engine.verify(input);

      expect(result.gain).toBe(0);
      expect(result.loss).toBe(0);
      expect(result.netImpact).toBe(0);
      expect(result.recommendRollback).toBe(false);
      expect(result.sideEffects).toHaveLength(0);
    });
  });

  // ─── Side Effects Detection ─────────────────────────────────

  describe('side effects', () => {
    it('should detect improved metrics', () => {
      const input: VerificationInput = {
        actionId: 'action-6',
        actionType: ActionType.ADJUST_BID,
        skuId: 'sku-1',
        intendedValue: 2,
        beforeMetrics: makeMetricsSnapshot({
          adsSpend24h: 100,
          adsOrders24h: 5,
          acos: 40,
          sales24h: 500,
          units24h: 20,
        }),
        afterMetrics: makeMetricsSnapshot({
          adsSpend24h: 60,  // reduced (improved for lower_is_better)
          adsOrders24h: 6,  // increased (improved for higher_is_better)
          acos: 20,         // reduced (improved for lower_is_better)
          sales24h: 520,
          units24h: 22,
        }),
      };

      const result = engine.verify(input);

      const acosSideEffect = result.sideEffects.find((e) => e.metric === 'acos');
      expect(acosSideEffect).toBeDefined();
      expect(acosSideEffect!.direction).toBe('IMPROVED');

      const spendEffect = result.sideEffects.find((e) => e.metric === 'adsSpend24h');
      expect(spendEffect).toBeDefined();
      expect(spendEffect!.direction).toBe('IMPROVED');
    });

    it('should detect degraded metrics', () => {
      const input: VerificationInput = {
        actionId: 'action-7',
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        intendedValue: 35,
        beforeMetrics: makeMetricsSnapshot({
          sales24h: 500,
          units24h: 20,
          rank: 50,
        }),
        afterMetrics: makeMetricsSnapshot({
          sales24h: 300, // degraded
          units24h: 12,  // degraded
          rank: 80,      // degraded (higher = worse)
        }),
      };

      const result = engine.verify(input);

      const salesEffect = result.sideEffects.find((e) => e.metric === 'sales24h');
      expect(salesEffect).toBeDefined();
      expect(salesEffect!.direction).toBe('DEGRADED');

      const rankEffect = result.sideEffects.find((e) => e.metric === 'rank');
      expect(rankEffect).toBeDefined();
      expect(rankEffect!.direction).toBe('DEGRADED');
    });
  });

  // ─── Verification Timestamp ─────────────────────────────────

  describe('output format', () => {
    it('should include verifiedAt timestamp', () => {
      const input: VerificationInput = {
        actionId: 'action-8',
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        intendedValue: 29.99,
        beforeMetrics: makeMetricsSnapshot(),
        afterMetrics: makeMetricsSnapshot(),
      };

      const result = engine.verify(input);

      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(result.actionId).toBe('action-8');
      expect(result.skuId).toBe('sku-1');
    });
  });
});
