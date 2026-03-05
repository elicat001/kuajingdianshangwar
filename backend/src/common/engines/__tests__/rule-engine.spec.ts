import { RuleEngine, Rule, RuleContext } from '../rule-engine';
import { AlertType, Severity, ActionType } from '../../enums';
import { makeSkuMetrics } from '../../../../test/utils/test-helpers';

function createTestRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'test-rule',
    name: 'Test Rule',
    type: AlertType.STOCKOUT,
    priority: 10,
    enabled: true,
    condition: () => true,
    severity: () => Severity.MEDIUM,
    buildEvidence: () => ({ test: true }),
    buildRecommendation: () => [],
    ...overrides,
  };
}

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  describe('registerRule', () => {
    it('should register a rule', () => {
      const rule = createTestRule({ id: 'rule-1' });
      engine.registerRule(rule);

      const list = engine.listRules();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('rule-1');
    });

    it('should overwrite rule with same id', () => {
      engine.registerRule(createTestRule({ id: 'rule-1', name: 'First' }));
      engine.registerRule(createTestRule({ id: 'rule-1', name: 'Second' }));

      const list = engine.listRules();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Second');
    });
  });

  describe('evaluate', () => {
    it('should return alerts when rule condition matches', () => {
      engine.registerRule(
        createTestRule({
          id: 'match-rule',
          condition: () => true,
          severity: () => Severity.HIGH,
          buildEvidence: (ctx) => ({ daysOfCover: ctx.sku.daysOfCover }),
          buildRecommendation: () => [
            {
              type: ActionType.CREATE_REORDER,
              label: 'Reorder',
              params: {},
              riskLevel: 'HIGH',
            },
          ],
        }),
      );

      const context: RuleContext = {
        sku: makeSkuMetrics({ daysOfCover: 2 }),
        thresholds: {},
      };

      const result = engine.evaluate(context);

      expect(result.rulesEvaluated).toBe(1);
      expect(result.rulesTriggered).toBe(1);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].severity).toBe(Severity.HIGH);
      expect(result.alerts[0].evidence.daysOfCover).toBe(2);
      expect(result.alerts[0].recommendations).toHaveLength(1);
    });

    it('should not return alert when condition returns false', () => {
      engine.registerRule(
        createTestRule({ condition: () => false }),
      );

      const context: RuleContext = {
        sku: makeSkuMetrics(),
        thresholds: {},
      };

      const result = engine.evaluate(context);

      expect(result.rulesTriggered).toBe(0);
      expect(result.alerts).toHaveLength(0);
    });
  });

  describe('rule priority', () => {
    it('should evaluate rules in priority order (lower number first)', () => {
      const order: string[] = [];

      engine.registerRule(
        createTestRule({
          id: 'low-priority',
          priority: 100,
          condition: () => { order.push('low'); return true; },
        }),
      );
      engine.registerRule(
        createTestRule({
          id: 'high-priority',
          priority: 1,
          condition: () => { order.push('high'); return true; },
        }),
      );
      engine.registerRule(
        createTestRule({
          id: 'mid-priority',
          priority: 50,
          condition: () => { order.push('mid'); return true; },
        }),
      );

      engine.evaluate({ sku: makeSkuMetrics(), thresholds: {} });

      expect(order).toEqual(['high', 'mid', 'low']);
    });
  });

  describe('rule disabling', () => {
    it('should skip disabled rules', () => {
      engine.registerRule(
        createTestRule({ id: 'enabled-rule', enabled: true }),
      );
      engine.registerRule(
        createTestRule({ id: 'disabled-rule', enabled: false }),
      );

      const result = engine.evaluate({
        sku: makeSkuMetrics(),
        thresholds: {},
      });

      expect(result.rulesEvaluated).toBe(1);
      expect(result.rulesTriggered).toBe(1);
    });

    it('should toggle rule enabled state at runtime', () => {
      engine.registerRule(
        createTestRule({ id: 'toggle-rule', enabled: true }),
      );

      engine.setRuleEnabled('toggle-rule', false);

      const result = engine.evaluate({
        sku: makeSkuMetrics(),
        thresholds: {},
      });

      expect(result.rulesEvaluated).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should silently skip rules that throw errors', () => {
      engine.registerRule(
        createTestRule({
          id: 'error-rule',
          condition: () => { throw new Error('boom'); },
        }),
      );
      engine.registerRule(
        createTestRule({
          id: 'good-rule',
          priority: 20,
          condition: () => true,
        }),
      );

      const result = engine.evaluate({
        sku: makeSkuMetrics(),
        thresholds: {},
      });

      expect(result.rulesTriggered).toBe(1);
      expect(result.alerts[0].ruleId).toBe('good-rule');
    });
  });
});
