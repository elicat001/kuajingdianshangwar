import {
  AlertType, Severity, AlertStatus, ActionType, ActionStatus,
  RiskLevel, RecommendationStatus,
  type WarRoomMetrics, type Alert, type Sku, type Action, type Recommendation,
  type TrendPoint, type AdsTrendPoint, type SkuMetrics,
} from '@/types';
import dayjs from 'dayjs';

export const mockMetrics: WarRoomMetrics = {
  totalSales: 52380, totalOrders: 1247, adsSpend: 8120, tacos: 15.5,
  stockoutSkus: 3, avgDaysOfCover: 28.6, totalSkus: 10, activeAlerts: 4,
};

export const mockSkus: Sku[] = [
  { id: 'sku-1', companyId: 'c1', sku: 'WH-001-US', asin: 'B0CK1XNRGH', storeId: 's1', siteId: 'us', title: 'Wireless Headphones Pro', category: 'Electronics', costUnit: 12.5, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
  { id: 'sku-2', companyId: 'c1', sku: 'KB-002-US', asin: 'B0CL2YMTJK', storeId: 's1', siteId: 'us', title: 'Mechanical Keyboard RGB', category: 'Electronics', costUnit: 18, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
  { id: 'sku-3', companyId: 'c1', sku: 'YM-003-US', asin: 'B0CM3ZNUKL', storeId: 's1', siteId: 'us', title: 'Yoga Mat Premium 6mm', category: 'Sports', costUnit: 5.5, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
  { id: 'sku-4', companyId: 'c1', sku: 'WB-004-US', asin: 'B0CN4AOVLM', storeId: 's1', siteId: 'us', title: 'Water Bottle Insulated 32oz', category: 'Kitchen', costUnit: 3.2, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
  { id: 'sku-5', companyId: 'c1', sku: 'PH-005-US', asin: 'B0CP5BPWMN', storeId: 's1', siteId: 'us', title: 'Phone Stand Adjustable', category: 'Electronics', costUnit: 2.8, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
  { id: 'sku-6', companyId: 'c1', sku: 'WH-001-UK', asin: 'B0CK1XNRGH', storeId: 's2', siteId: 'uk', title: 'Wireless Headphones Pro', category: 'Electronics', costUnit: 12.5, status: 'ACTIVE', storeName: 'Demo UK Store', siteName: 'UK' },
  { id: 'sku-7', companyId: 'c1', sku: 'KB-002-UK', asin: 'B0CL2YMTJK', storeId: 's2', siteId: 'uk', title: 'Mechanical Keyboard RGB', category: 'Electronics', costUnit: 18, status: 'ACTIVE', storeName: 'Demo UK Store', siteName: 'UK' },
  { id: 'sku-8', companyId: 'c1', sku: 'LP-008-US', asin: 'B0CQ6CQXNO', storeId: 's1', siteId: 'us', title: 'LED Desk Lamp Touch', category: 'Home', costUnit: 8, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
  { id: 'sku-9', companyId: 'c1', sku: 'BB-009-US', asin: 'B0CR7DRYOP', storeId: 's1', siteId: 'us', title: 'Bluetooth Speaker Mini', category: 'Electronics', costUnit: 9, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
  { id: 'sku-10', companyId: 'c1', sku: 'CT-010-US', asin: 'B0CS8ESZPQ', storeId: 's1', siteId: 'us', title: 'Camping Tent 2-Person', category: 'Outdoors', costUnit: 25, status: 'ACTIVE', storeName: 'Demo US Store', siteName: 'US' },
];

export const mockAlerts: Alert[] = [
  { id: 'alt-1', type: AlertType.STOCKOUT, severity: Severity.HIGH, status: AlertStatus.OPEN, skuId: 'sku-2', title: 'KB-002-US: Critical Low Stock', message: 'Days of cover: 2.1 days', evidenceJson: { available: 15, avg7d: 7.2, daysOfCover: 2.1 }, createdAt: dayjs().subtract(2, 'hour').toISOString(), skuName: 'Mechanical Keyboard RGB', asin: 'B0CL2YMTJK' },
  { id: 'alt-2', type: AlertType.STOCKOUT, severity: Severity.MEDIUM, status: AlertStatus.OPEN, skuId: 'sku-4', title: 'WB-004-US: Low Stock Warning', message: 'Days of cover: 5.3 days', evidenceJson: { available: 8, avg7d: 1.5, daysOfCover: 5.3 }, createdAt: dayjs().subtract(1, 'hour').toISOString(), skuName: 'Water Bottle Insulated', asin: 'B0CN4AOVLM' },
  { id: 'alt-3', type: AlertType.ADS_WASTE, severity: Severity.HIGH, status: AlertStatus.OPEN, skuId: 'sku-2', title: 'KB-002-US: Ad Spend Zero Orders', message: '$85 spent, 0 orders in 24h', evidenceJson: { spend: 85, orders: 0, clicks: 200 }, createdAt: dayjs().subtract(30, 'minute').toISOString(), skuName: 'Mechanical Keyboard RGB', asin: 'B0CL2YMTJK' },
  { id: 'alt-4', type: AlertType.COMPETITOR_PRICE_DROP, severity: Severity.MEDIUM, status: AlertStatus.ACKNOWLEDGED, skuId: 'sku-1', title: 'WH-001-US: Competitor Drop 15%', message: 'SoundMax: $34.99 → $29.99', evidenceJson: { competitor: 'SoundMax', oldPrice: 34.99, newPrice: 29.99, dropPct: 14.3 }, createdAt: dayjs().subtract(5, 'hour').toISOString(), skuName: 'Wireless Headphones Pro', asin: 'B0CK1XNRGH' },
  { id: 'alt-5', type: AlertType.ACOS_ANOMALY, severity: Severity.HIGH, status: AlertStatus.OPEN, skuId: 'sku-9', title: 'BB-009-US: ACOS Spike 85%', message: 'ACOS jumped from 22% to 85%', evidenceJson: { prevAcos: 22, currentAcos: 85 }, createdAt: dayjs().subtract(3, 'hour').toISOString(), skuName: 'Bluetooth Speaker Mini', asin: 'B0CR7DRYOP' },
  { id: 'alt-6', type: AlertType.SLOW_MOVING, severity: Severity.LOW, status: AlertStatus.OPEN, skuId: 'sku-5', title: 'PH-005-US: Slow Moving Inventory', message: '120 days of cover, declining sales', evidenceJson: { daysOfCover: 120, salesTrend: -18 }, createdAt: dayjs().subtract(1, 'day').toISOString(), skuName: 'Phone Stand Adjustable', asin: 'B0CP5BPWMN' },
  { id: 'alt-7', type: AlertType.RANK_CHANGE, severity: Severity.MEDIUM, status: AlertStatus.CLOSED, skuId: 'sku-3', title: 'YM-003-US: Competitor Rank Surge', message: 'FlexYoga rank: 120 → 45', evidenceJson: { competitor: 'FlexYoga', oldRank: 120, newRank: 45 }, createdAt: dayjs().subtract(2, 'day').toISOString(), skuName: 'Yoga Mat Premium', asin: 'B0CM3ZNUKL' },
  { id: 'alt-8', type: AlertType.REVIEW_ANOMALY, severity: Severity.LOW, status: AlertStatus.OPEN, skuId: 'sku-1', title: 'WH-001-US: Competitor Review Spike', message: 'AudioPro: +150 reviews in 24h', evidenceJson: { competitor: 'AudioPro', reviewsAdded: 150, avgDaily: 12 }, createdAt: dayjs().subtract(6, 'hour').toISOString(), skuName: 'Wireless Headphones Pro', asin: 'B0CK1XNRGH' },
];

export const mockRecommendations: Recommendation[] = [
  { id: 'rec-1', alertId: 'alt-1', skuId: 'sku-2', rationale: 'Immediate reorder: 2.1 days cover at 7.2 units/day velocity. Lead time 30 days.', evidenceJson: { available: 15, avg7d: 7.2 }, expectedGain: 0, riskLevel: RiskLevel.HIGH, suggestedActions: [{ type: 'CREATE_REORDER', params: { qty: 250, urgency: 'high' } }], status: RecommendationStatus.PENDING, createdAt: dayjs().subtract(2, 'hour').toISOString() },
  { id: 'rec-2', alertId: 'alt-3', skuId: 'sku-2', rationale: 'Pause ad group AG002 and add negative keywords. $85 wasted with 0 conversions.', evidenceJson: { spend: 85, orders: 0 }, expectedGain: 85, riskLevel: RiskLevel.MEDIUM, suggestedActions: [{ type: 'PAUSE_ADGROUP', params: { adgroupId: 'AG002' } }, { type: 'ADD_NEGATIVE_KEYWORD', params: { keywords: ['cheap', 'free'] } }], status: RecommendationStatus.PENDING, createdAt: dayjs().subtract(30, 'minute').toISOString() },
  { id: 'rec-3', alertId: 'alt-4', skuId: 'sku-1', rationale: 'Defend position with 3% price cut. Competitor dropped 15%.', evidenceJson: { competitor: 'SoundMax', dropPct: 14.3 }, expectedGain: 50, riskLevel: RiskLevel.MEDIUM, suggestedActions: [{ type: 'ADJUST_PRICE', params: { strategy: 'defend_margin', maxDeltaPct: 3 } }], status: RecommendationStatus.PENDING, createdAt: dayjs().subtract(5, 'hour').toISOString() },
  { id: 'rec-4', alertId: 'alt-5', skuId: 'sku-9', rationale: 'Reduce bid by 20% on high-ACOS campaigns. Current ACOS 85% vs target 30%.', evidenceJson: { currentAcos: 85, targetAcos: 30 }, expectedGain: 120, riskLevel: RiskLevel.HIGH, suggestedActions: [{ type: 'ADJUST_BID', params: { deltaPct: -20 } }], status: RecommendationStatus.ACCEPTED, createdAt: dayjs().subtract(3, 'hour').toISOString() },
  { id: 'rec-5', alertId: 'alt-6', skuId: 'sku-5', rationale: 'Consider clearance pricing to reduce slow-moving inventory.', evidenceJson: { daysOfCover: 120 }, expectedGain: 200, riskLevel: RiskLevel.LOW, suggestedActions: [{ type: 'ADJUST_PRICE', params: { strategy: 'clearance', maxDeltaPct: 15 } }], status: RecommendationStatus.PENDING, createdAt: dayjs().subtract(1, 'day').toISOString() },
];

export const mockActions: Action[] = [
  { id: 'act-1', recommendationId: 'rec-1', type: ActionType.CREATE_REORDER, status: ActionStatus.SUBMITTED, params: { qty: 250, urgency: 'high' }, guardrails: {}, riskScore: 3, requiresApproval: true, skuId: 'sku-2', createdBy: 'Operator Li', executedAt: '', verificationResult: null, createdAt: dayjs().subtract(1, 'hour').toISOString(), skuName: 'Mechanical Keyboard RGB' },
  { id: 'act-2', recommendationId: 'rec-2', type: ActionType.PAUSE_ADGROUP, status: ActionStatus.APPROVED, params: { adgroupId: 'AG002' }, guardrails: { cooldownHours: 6 }, riskScore: 2, requiresApproval: false, skuId: 'sku-2', createdBy: 'Operator Li', executedAt: '', verificationResult: null, createdAt: dayjs().subtract(30, 'minute').toISOString(), skuName: 'Mechanical Keyboard RGB' },
  { id: 'act-3', recommendationId: 'rec-3', type: ActionType.ADJUST_PRICE, status: ActionStatus.EXECUTED, params: { newPrice: 31.99, oldPrice: 32.99, deltaPct: -3 }, guardrails: { maxDeltaPct: 3, minMarginFloor: 15, cooldownHours: 6 }, riskScore: 5, requiresApproval: true, skuId: 'sku-1', createdBy: 'Manager Wang', executedAt: dayjs().subtract(4, 'hour').toISOString(), verificationResult: null, createdAt: dayjs().subtract(5, 'hour').toISOString(), skuName: 'Wireless Headphones Pro' },
  { id: 'act-4', recommendationId: 'rec-4', type: ActionType.ADJUST_BID, status: ActionStatus.VERIFIED, params: { deltaPct: -20, oldBid: 1.2, newBid: 0.96 }, guardrails: { maxDeltaPct: 25 }, riskScore: 4, requiresApproval: true, skuId: 'sku-9', createdBy: 'Manager Wang', executedAt: dayjs().subtract(2, 'hour').toISOString(), verificationResult: { gain: 45, loss: 0, recommendRollback: false }, createdAt: dayjs().subtract(3, 'hour').toISOString(), skuName: 'Bluetooth Speaker Mini' },
  { id: 'act-5', recommendationId: 'rec-5', type: ActionType.ADJUST_PRICE, status: ActionStatus.DRAFT, params: { strategy: 'clearance', maxDeltaPct: 15 }, guardrails: { maxDeltaPct: 15, minMarginFloor: 5 }, riskScore: 6, requiresApproval: true, skuId: 'sku-5', createdBy: 'Admin', executedAt: '', verificationResult: null, createdAt: dayjs().subtract(12, 'hour').toISOString(), skuName: 'Phone Stand Adjustable' },
  { id: 'act-6', recommendationId: 'rec-2', type: ActionType.ADD_NEGATIVE_KEYWORD, status: ActionStatus.CLOSED, params: { keywords: ['cheap', 'free'] }, guardrails: {}, riskScore: 1, requiresApproval: false, skuId: 'sku-2', createdBy: 'Operator Li', executedAt: dayjs().subtract(20, 'minute').toISOString(), verificationResult: { gain: 0, loss: 0, recommendRollback: false }, createdAt: dayjs().subtract(25, 'minute').toISOString(), skuName: 'Mechanical Keyboard RGB' },
];

const generateTrend = (days: number, baseSales: number, baseOrders: number): TrendPoint[] =>
  Array.from({ length: days }, (_, i) => ({
    date: dayjs().subtract(days - 1 - i, 'day').format('MM-DD'),
    sales: Math.round(baseSales * (0.85 + Math.random() * 0.3)),
    orders: Math.round(baseOrders * (0.85 + Math.random() * 0.3)),
  }));

const generateAdsTrend = (days: number): AdsTrendPoint[] =>
  Array.from({ length: days }, (_, i) => ({
    date: dayjs().subtract(days - 1 - i, 'day').format('MM-DD'),
    spend: Math.round(200 + Math.random() * 150),
    acos: Math.round((18 + Math.random() * 15) * 10) / 10,
    orders: Math.round(15 + Math.random() * 20),
  }));

export const mockSalesTrend: TrendPoint[] = generateTrend(30, 1800, 42);
export const mockAdsTrend: AdsTrendPoint[] = generateAdsTrend(30);

export const generateSkuMetrics = (): SkuMetrics => ({
  sales7d: Array.from({ length: 7 }, () => Math.round(800 + Math.random() * 600)),
  adsSpend7d: Array.from({ length: 7 }, () => Math.round(50 + Math.random() * 100)),
  acos7d: Array.from({ length: 7 }, () => Math.round((15 + Math.random() * 20) * 10) / 10),
  units7d: Array.from({ length: 7 }, () => Math.round(20 + Math.random() * 30)),
  daysOfCover: Math.round(5 + Math.random() * 50),
  tacos: Math.round((10 + Math.random() * 15) * 10) / 10,
  revenue: Math.round(5000 + Math.random() * 10000),
  profit: Math.round(1000 + Math.random() * 3000),
});
