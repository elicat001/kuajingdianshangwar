import { ApprovalStrategy, ApprovalActionInput } from '../approval-strategy';
import { ActionType, UserRole } from '../../enums';

describe('ApprovalStrategy', () => {
  let strategy: ApprovalStrategy;

  beforeEach(() => {
    strategy = new ApprovalStrategy();
  });

  // ─── Risk Score Calculation ─────────────────────────────────

  describe('calculateRiskScore', () => {
    it('should return base risk for action type', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADD_NEGATIVE_KEYWORD,
        deltaPct: 0,
        estimatedImpactUsd: 100,
      };

      const score = strategy.calculateRiskScore(input);
      expect(score).toBe(10); // base risk for ADD_NEGATIVE_KEYWORD
    });

    it('should add delta excess penalty', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADJUST_PRICE,
        deltaPct: 25, // 10 above largeDeltaPct (15)
        estimatedImpactUsd: 100,
      };

      const score = strategy.calculateRiskScore(input);
      // base 30 + 10 excess = 40
      expect(score).toBe(40);
    });

    it('should add impact excess penalty', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADJUST_PRICE,
        deltaPct: 5,
        estimatedImpactUsd: 7000, // 2000 above largeImpactUsd (5000), floor(2000/500) = 4
      };

      const score = strategy.calculateRiskScore(input);
      // base 30 + 4 impact penalty = 34
      expect(score).toBe(34);
    });

    it('should add batch penalty for large batches', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADJUST_PRICE,
        deltaPct: 5,
        estimatedImpactUsd: 100,
        isBatch: true,
        affectedSkuCount: 15, // > largeBatchCount (10)
      };

      const score = strategy.calculateRiskScore(input);
      // base 30 + 15 batch penalty = 45
      expect(score).toBe(45);
    });

    it('should clamp score to [0, 100]', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADJUST_PRICE,
        deltaPct: 50,
        estimatedImpactUsd: 50000,
        isBatch: true,
        affectedSkuCount: 100,
      };

      const score = strategy.calculateRiskScore(input);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Approval Decision ─────────────────────────────────────

  describe('determineApproval', () => {
    it('should not require approval for low-risk actions', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADD_NEGATIVE_KEYWORD,
        deltaPct: 0,
        estimatedImpactUsd: 50,
      };

      const decision = strategy.determineApproval(input);

      expect(decision.requiresApproval).toBe(false);
      expect(decision.riskScore).toBeLessThan(40);
    });

    it('should require manager approval for medium-risk actions', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADJUST_PRICE,
        deltaPct: 25, // score = 30 + 10 = 40, equals approvalThreshold
        estimatedImpactUsd: 100,
      };

      const decision = strategy.determineApproval(input);

      expect(decision.requiresApproval).toBe(true);
      expect(decision.riskScore).toBeGreaterThanOrEqual(40);
      expect(decision.approverRoles).toContain(UserRole.MANAGER);
    });

    it('should require senior approval for high-risk actions', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADJUST_PRICE,
        deltaPct: 45, // score = 30 + 30(capped) = 60, plus impact...
        estimatedImpactUsd: 30000, // excess = 25000, floor(25000/500) = 50, capped at 20 -> 80
      };

      const decision = strategy.determineApproval(input);

      expect(decision.requiresApproval).toBe(true);
      expect(decision.riskScore).toBeGreaterThanOrEqual(70);
      expect(decision.approverRoles).toContain(UserRole.ADMIN);
    });

    it('should force approval when delta exceeds 2x large threshold', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADD_NEGATIVE_KEYWORD, // low base risk
        deltaPct: 35, // > 2 * 15 = 30
        estimatedImpactUsd: 10,
      };

      const decision = strategy.determineApproval(input);

      expect(decision.requiresApproval).toBe(true);
      expect(decision.reasons.some((r) => r.includes('2x large threshold'))).toBe(true);
    });

    it('should force super admin approval when impact exceeds 3x threshold', () => {
      const input: ApprovalActionInput = {
        actionType: ActionType.ADD_NEGATIVE_KEYWORD,
        deltaPct: 0,
        estimatedImpactUsd: 20000, // > 3 * 5000 = 15000
      };

      const decision = strategy.determineApproval(input);

      expect(decision.requiresApproval).toBe(true);
      expect(decision.approverRoles).toContain(UserRole.SUPER_ADMIN);
    });
  });

  // ─── Custom Thresholds ──────────────────────────────────────

  describe('custom thresholds', () => {
    it('should respect custom approval threshold', () => {
      const customStrategy = new ApprovalStrategy({ approvalThreshold: 20 });

      const input: ApprovalActionInput = {
        actionType: ActionType.ADJUST_BID,
        deltaPct: 10,
        estimatedImpactUsd: 100,
      };

      // base risk = 15, which is < 20 even with no excess
      const decision = customStrategy.determineApproval(input);

      expect(decision.riskScore).toBeLessThan(20);
      expect(decision.requiresApproval).toBe(false);
    });
  });
});
