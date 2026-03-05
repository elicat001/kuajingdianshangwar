/**
 * Metrics calculation utilities for the AI Commerce War OS.
 */

/**
 * Calculate days of cover (inventory runway).
 * Returns Infinity when avgDailyUnits is 0 (no sales, infinite cover).
 */
export function calcDaysOfCover(
  available: number,
  avgDailyUnits7d: number,
): number {
  if (avgDailyUnits7d <= 0) return Infinity;
  return available / avgDailyUnits7d;
}

/**
 * Calculate TACOS (Total Advertising Cost of Sales).
 * TACOS = adsSpend / totalSales * 100
 */
export function calcTacos(adsSpend: number, totalSales: number): number {
  if (totalSales <= 0) return 0;
  return (adsSpend / totalSales) * 100;
}

/**
 * Calculate a waste score for ad campaigns.
 * Higher score means more wasteful.
 *
 * @param spend      - Total ad spend
 * @param orders     - Total ad orders
 * @param acosDurationDays - Number of consecutive days ACOS was above threshold
 * @returns Waste score between 0 and 100
 */
export function calcWasteScore(
  spend: number,
  orders: number,
  acosDurationDays: number,
): number {
  if (spend <= 0) return 0;

  let score = 0;

  // Zero orders with spend is the worst
  if (orders === 0) {
    score += 50;
  } else {
    // Cost per order factor
    const costPerOrder = spend / orders;
    score += Math.min(costPerOrder / 2, 30); // cap at 30
  }

  // Duration factor: sustained poor ACOS adds to waste
  score += Math.min(acosDurationDays * 5, 30); // cap at 30

  // Spend magnitude factor
  if (spend > 500) score += 10;
  else if (spend > 200) score += 5;
  else if (spend > 100) score += 2;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate a threat score for competitor actions.
 *
 * @param priceDeltaPct  - Competitor price change percentage (negative = drop)
 * @param rankChange     - Rank improvement (positive = competitor improved)
 * @param reviewGrowthMultiple - Review growth vs average (e.g. 3 = 3x normal)
 * @returns Threat score between 0 and 100
 */
export function calcThreatScore(
  priceDeltaPct: number,
  rankChange: number,
  reviewGrowthMultiple: number,
): number {
  let score = 0;

  // Price drop threat: each 1% drop adds 3 points
  if (priceDeltaPct < 0) {
    score += Math.min(Math.abs(priceDeltaPct) * 3, 40);
  }

  // Rank surge threat: each 10 positions improved adds 2 points
  if (rankChange > 0) {
    score += Math.min((rankChange / 10) * 2, 30);
  }

  // Review anomaly threat
  if (reviewGrowthMultiple > 1) {
    score += Math.min((reviewGrowthMultiple - 1) * 5, 20);
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Statistical Helpers ──────────────────────────────────────

/**
 * Calculate arithmetic mean of an array of numbers.
 */
export function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate population standard deviation.
 */
export function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calcMean(values);
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate simple moving average over a window.
 *
 * @param values - Array of values (most recent first)
 * @param window - Window size
 * @returns Array of SMA values (length = values.length - window + 1)
 */
export function calcMovingAverage(values: number[], window: number): number[] {
  if (values.length < window || window <= 0) return [];

  const result: number[] = [];
  for (let i = 0; i <= values.length - window; i++) {
    const slice = values.slice(i, i + window);
    result.push(calcMean(slice));
  }
  return result;
}

/**
 * Calculate percentage change between two values.
 */
export function calcPctChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}
