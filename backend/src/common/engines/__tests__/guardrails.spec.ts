import {
  GuardrailChecker,
  ActionRequest,
  DEFAULT_PRICE_GUARDRAIL,
  DEFAULT_BUDGET_GUARDRAIL,
} from '../guardrails';
import { ActionType } from '../../enums';

describe('GuardrailChecker', () => {
  let checker: GuardrailChecker;

  beforeEach(() => {
    checker = new GuardrailChecker();
  });

  // ─── Max Delta Percentage ───────────────────────────────────

  describe('max delta check', () => {
    it('should reject when price change exceeds maxDeltaPct', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -20, // 20% decrease, limit is 15%
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('exceeds max allowed');
    });

    it('should pass when change is within limit', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -10,
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  // ─── Cooldown ───────────────────────────────────────────────

  describe('cooldown check', () => {
    it('should reject when last change was within cooldown period', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -5,
        lastChangeAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);
      // cooldownHours = 4, only 1 hour passed

      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain('Cooldown active');
    });

    it('should pass when cooldown has elapsed', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -5,
        lastChangeAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(true);
    });
  });

  // ─── Daily Limit ────────────────────────────────────────────

  describe('daily changes limit check', () => {
    it('should reject when daily change limit is reached', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -5,
        changesToday: 3, // maxChangesPerDay = 3 for PRICE
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain('Daily change limit reached');
    });

    it('should pass when below daily limit', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -5,
        changesToday: 1,
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(true);
    });
  });

  // ─── Financial Impact ───────────────────────────────────────

  describe('financial impact check', () => {
    it('should reject when estimated impact exceeds maxImpactUsd', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -5,
        estimatedImpactUsd: 6000, // maxImpactUsd = 5000
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain('exceeds max');
    });
  });

  // ─── Multiple Violations ────────────────────────────────────

  describe('multiple violations', () => {
    it('should report all violations at once', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -25, // exceeds 15%
        lastChangeAt: new Date(Date.now() - 30 * 60 * 1000), // 0.5h ago
        changesToday: 5, // exceeds 3
        estimatedImpactUsd: 10000, // exceeds 5000
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── Normal Range → Pass ────────────────────────────────────

  describe('within all limits', () => {
    it('should pass when all guardrail checks are within range', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -5,
        projectedMarginPct: 20,
        estimatedImpactUsd: 100,
        lastChangeAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        changesToday: 0,
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  // ─── Margin Floor ───────────────────────────────────────────

  describe('margin floor check', () => {
    it('should reject when projected margin is below floor', () => {
      const action: ActionRequest = {
        actionType: ActionType.ADJUST_PRICE,
        skuId: 'sku-1',
        deltaPct: -10,
        projectedMarginPct: 3, // minMarginFloor = 5%
      };

      const result = checker.check(action, DEFAULT_PRICE_GUARDRAIL);

      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain('below floor');
    });
  });
});
