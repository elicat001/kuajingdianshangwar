/**
 * IFS profit formula and link analysis calculation utilities.
 * Ported from Ke/ Django backend: _ifs_profit_term, _link_analysis_profit_ctx, etc.
 */

/**
 * IFS profit term: price-tiered profit formula.
 * Price  (0,80)  -> 0.8  * sales - 4  * conversions
 * Price [80,100) -> 0.86 * sales - 16 * conversions
 * Price [100,200)-> 0.86 * sales - 20 * conversions
 * Price >= 200   -> 0.86 * sales - 26 * conversions
 */
export function calculateIfsProfit(
  price: number,
  conversions: number,
  sales: number,
): number {
  if (!Number.isFinite(sales) || !Number.isFinite(conversions)) return 0;
  if (!Number.isFinite(price) || price <= 0) return 0;

  if (price < 80) return 0.8 * sales - 4 * conversions;
  if (price < 100) return 0.86 * sales - 16 * conversions;
  if (price < 200) return 0.86 * sales - 20 * conversions;
  // price >= 200
  return 0.86 * sales - 26 * conversions;
}

/**
 * Full link profit: IFS profit minus cost deduction minus promotion fee.
 * costDeduction = conversions * (cost + 2.5) + sales * 0.02
 * profit = ifsProfit - costDeduction - promotionFee
 */
export function calculateLinkProfit(params: {
  ifsProfit: number;
  conversions: number;
  cost: number;
  promotionFee: number;
  sales: number;
}): number {
  const { ifsProfit, conversions, cost, promotionFee, sales } = params;
  const costDeduction = conversions * (cost + 2.5) + sales * 0.02;
  return ifsProfit - costDeduction - promotionFee;
}

/**
 * Days of sale: how many days the available stock will last
 * based on the 7-day sales quantity.
 * Returns null when sevenDayQty <= 0 (infinite / no sales).
 */
export function calculateDaysOfSale(
  availableStock: number,
  sevenDayQty: number,
): number | null {
  if (!Number.isFinite(availableStock) || !Number.isFinite(sevenDayQty)) {
    return null;
  }
  if (sevenDayQty <= 0) return null;
  return Math.round(((availableStock * 7) / sevenDayQty) * 100) / 100;
}

/**
 * Generate 7 dates from yesterday back to 7-days-ago, as YYYY-MM-DD strings.
 * Index 0 = 7 days ago, index 6 = yesterday.
 */
export function generateSevenDates(baseDate?: Date): string[] {
  const base = baseDate ? new Date(baseDate) : new Date();
  const dates: string[] = [];
  for (let i = 7; i >= 1; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
