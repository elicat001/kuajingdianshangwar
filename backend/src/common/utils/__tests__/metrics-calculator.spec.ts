import {
  calcDaysOfCover,
  calcTacos,
  calcWasteScore,
  calcThreatScore,
  calcMean,
  calcStdDev,
  calcMovingAverage,
  calcPctChange,
} from '../metrics-calculator';

describe('Metrics Calculator', () => {
  // ─── calcDaysOfCover ────────────────────────────────────────

  describe('calcDaysOfCover', () => {
    it('should calculate normal days of cover', () => {
      expect(calcDaysOfCover(100, 10)).toBe(10);
      expect(calcDaysOfCover(50, 5)).toBe(10);
      expect(calcDaysOfCover(30, 10)).toBe(3);
    });

    it('should return Infinity when avgDailyUnits is 0', () => {
      expect(calcDaysOfCover(100, 0)).toBe(Infinity);
    });

    it('should return Infinity when avgDailyUnits is negative', () => {
      expect(calcDaysOfCover(100, -5)).toBe(Infinity);
    });

    it('should return 0 when available is 0', () => {
      expect(calcDaysOfCover(0, 10)).toBe(0);
    });

    it('should handle fractional results', () => {
      const result = calcDaysOfCover(7, 3);
      expect(result).toBeCloseTo(2.333, 2);
    });
  });

  // ─── calcTacos ──────────────────────────────────────────────

  describe('calcTacos', () => {
    it('should calculate TACOS correctly', () => {
      expect(calcTacos(50, 500)).toBe(10);
      expect(calcTacos(100, 1000)).toBe(10);
    });

    it('should return 0 when totalSales is 0', () => {
      expect(calcTacos(50, 0)).toBe(0);
    });

    it('should return 0 when totalSales is negative', () => {
      expect(calcTacos(50, -100)).toBe(0);
    });

    it('should handle high TACOS', () => {
      expect(calcTacos(500, 100)).toBe(500);
    });
  });

  // ─── calcWasteScore ─────────────────────────────────────────

  describe('calcWasteScore', () => {
    it('should return highest waste for zero orders with high spend', () => {
      const score = calcWasteScore(600, 0, 5);
      // 50 (zero orders) + 25 (5 days * 5, capped 30) + 10 (spend > 500) = 85
      expect(score).toBe(85);
    });

    it('should return 0 when spend is 0', () => {
      expect(calcWasteScore(0, 5, 3)).toBe(0);
    });

    it('should factor in cost per order', () => {
      const lowCPO = calcWasteScore(50, 10, 0);  // CPO = 5, factor = min(2.5, 30) = 2.5
      const highCPO = calcWasteScore(500, 5, 0); // CPO = 100, factor = min(50, 30) = 30
      expect(highCPO).toBeGreaterThan(lowCPO);
    });

    it('should be clamped between 0 and 100', () => {
      const score = calcWasteScore(10000, 0, 100);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should add spend magnitude factor', () => {
      const lowSpend = calcWasteScore(50, 0, 0);   // 50 (zero orders) + 0 + 0
      const midSpend = calcWasteScore(150, 0, 0);  // 50 + 0 + 2
      const highSpend = calcWasteScore(300, 0, 0); // 50 + 0 + 5
      const vhighSpend = calcWasteScore(600, 0, 0); // 50 + 0 + 10

      expect(midSpend).toBeGreaterThan(lowSpend);
      expect(highSpend).toBeGreaterThan(midSpend);
      expect(vhighSpend).toBeGreaterThan(highSpend);
    });
  });

  // ─── calcThreatScore ────────────────────────────────────────

  describe('calcThreatScore', () => {
    it('should calculate threat from price drop', () => {
      const score = calcThreatScore(-10, 0, 0);
      // 10 * 3 = 30
      expect(score).toBe(30);
    });

    it('should calculate threat from rank improvement', () => {
      const score = calcThreatScore(0, 50, 0);
      // (50/10) * 2 = 10
      expect(score).toBe(10);
    });

    it('should calculate threat from review growth', () => {
      const score = calcThreatScore(0, 0, 5);
      // (5-1) * 5 = 20
      expect(score).toBe(20);
    });

    it('should combine all threat factors', () => {
      const score = calcThreatScore(-5, 30, 3);
      // price: min(15, 40) = 15
      // rank: min((30/10)*2, 30) = 6
      // review: min((3-1)*5, 20) = 10
      // total = 31
      expect(score).toBe(31);
    });

    it('should clamp to 100', () => {
      const score = calcThreatScore(-20, 200, 10);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for no threats', () => {
      const score = calcThreatScore(5, -10, 0.5);
      // price increase -> 0, rank worsened -> 0, review growth < 1 -> 0
      expect(score).toBe(0);
    });
  });

  // ─── Statistical Helpers ────────────────────────────────────

  describe('calcMean', () => {
    it('should calculate mean', () => {
      expect(calcMean([10, 20, 30])).toBe(20);
    });

    it('should return 0 for empty array', () => {
      expect(calcMean([])).toBe(0);
    });
  });

  describe('calcStdDev', () => {
    it('should calculate standard deviation', () => {
      const stddev = calcStdDev([10, 10, 10, 10]);
      expect(stddev).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(calcStdDev([42])).toBe(0);
    });

    it('should calculate correctly for known data', () => {
      // [2, 4, 4, 4, 5, 5, 7, 9] -> mean=5, variance=4, stddev=2
      const stddev = calcStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(stddev).toBe(2);
    });
  });

  describe('calcMovingAverage', () => {
    it('should calculate SMA', () => {
      const sma = calcMovingAverage([10, 20, 30, 40, 50], 3);
      expect(sma).toHaveLength(3);
      expect(sma[0]).toBe(20); // avg(10, 20, 30)
      expect(sma[1]).toBe(30); // avg(20, 30, 40)
      expect(sma[2]).toBe(40); // avg(30, 40, 50)
    });

    it('should return empty for insufficient data', () => {
      expect(calcMovingAverage([10, 20], 3)).toEqual([]);
    });
  });

  describe('calcPctChange', () => {
    it('should calculate percentage change', () => {
      expect(calcPctChange(100, 120)).toBe(20);
      expect(calcPctChange(100, 80)).toBe(-20);
    });

    it('should handle zero old value', () => {
      expect(calcPctChange(0, 10)).toBe(100);
      expect(calcPctChange(0, 0)).toBe(0);
    });
  });
});
