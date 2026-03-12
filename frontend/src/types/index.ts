export enum UserRole { SUPER_ADMIN='SUPER_ADMIN', ADMIN='ADMIN', MANAGER='MANAGER', OPERATOR='OPERATOR', VIEWER='VIEWER' }
export enum AlertType { STOCKOUT='STOCKOUT', ADS_WASTE='ADS_WASTE', COMPETITOR_PRICE_DROP='COMPETITOR_PRICE_DROP', RANK_CHANGE='RANK_CHANGE', REVIEW_ANOMALY='REVIEW_ANOMALY', SLOW_MOVING='SLOW_MOVING', ACOS_ANOMALY='ACOS_ANOMALY', MARGIN_BREACH='MARGIN_BREACH', PRICE_WAR='PRICE_WAR' }
export enum Severity { LOW='LOW', MEDIUM='MEDIUM', HIGH='HIGH', CRITICAL='CRITICAL' }
export enum AlertStatus { OPEN='OPEN', ACKNOWLEDGED='ACKNOWLEDGED', CLOSED='CLOSED' }
export enum ActionType { ADJUST_PRICE='ADJUST_PRICE', PAUSE_ADGROUP='PAUSE_ADGROUP', ADD_NEGATIVE_KEYWORD='ADD_NEGATIVE_KEYWORD', ADJUST_BUDGET='ADJUST_BUDGET', ADJUST_BID='ADJUST_BID', CREATE_REORDER='CREATE_REORDER', EXPAND_KEYWORDS='EXPAND_KEYWORDS', CHANGE_MATCH_TYPE='CHANGE_MATCH_TYPE' }
export enum ActionStatus { DRAFT='DRAFT', SUBMITTED='SUBMITTED', APPROVED='APPROVED', REJECTED='REJECTED', EXECUTED='EXECUTED', EXECUTED_FAILED='EXECUTED_FAILED', VERIFIED='VERIFIED', ROLLED_BACK='ROLLED_BACK', CLOSED='CLOSED' }
export enum RiskLevel { LOW='LOW', MEDIUM='MEDIUM', HIGH='HIGH' }
export enum RecommendationStatus { PENDING='PENDING', ACCEPTED='ACCEPTED', REJECTED='REJECTED', EXPIRED='EXPIRED' }

export interface Company { id: string; name: string; }
export interface User { id: string; companyId: string; email: string; name: string; displayName?: string; roles: UserRole[]; }
export interface Store { id: string; companyId: string; name: string; platform: string; sellerId: string; status: string; }
export interface Site { id: string; name: string; marketplaceCode: string; region: string; currency: string; timezone: string; }
export interface Sku {
  id: string; companyId: string; sku: string; asin: string; storeId: string; siteId: string;
  title: string; category: string; status: string;
  brand?: string; price?: number; cost?: number; imageUrl?: string;
  attributes?: Record<string, any>;
  purchasePrice?: number;
  shippingCost?: number;
  packagingCost?: number;
  exchangeRate?: number;
  weight?: number;
  boxSize?: string;
  packPerBox?: number;
  promoter?: string;
  storeName?: string; siteName?: string;
}
export interface Alert {
  id: string; type: AlertType; severity: Severity; status: AlertStatus;
  skuId: string; storeId?: string; siteId?: string;
  title: string; message: string; evidenceJson: Record<string, unknown>;
  createdAt: string; skuName?: string; asin?: string;
}
export interface Recommendation {
  id: string; alertId: string; skuId: string; rationale: string;
  evidenceJson: Record<string, unknown>; expectedGain: number; riskLevel: RiskLevel;
  suggestedActions: Record<string, unknown>[]; status: RecommendationStatus; createdAt: string;
}
export interface Action {
  id: string; recommendationId: string; type: ActionType; status: ActionStatus;
  params: Record<string, unknown>; guardrails: Record<string, unknown>;
  riskScore: number; requiresApproval: boolean; skuId: string; storeId?: string; siteId?: string;
  createdBy: string; executedAt: string; verificationResult: Record<string, unknown> | null;
  createdAt: string; skuName?: string;
}
export interface WarRoomMetrics {
  totalSales: number; totalOrders: number; adsSpend: number; tacos: number;
  stockoutSkus: number; avgDaysOfCover: number; totalSkus: number; activeAlerts: number;
  salesTrend?: number; adsSpendTrend?: number; tacosTrend?: number; stockoutTrend?: number;
}
export interface SkuMetrics {
  sales7d: number[]; adsSpend7d: number[]; acos7d: number[]; units7d: number[];
  daysOfCover: number; tacos: number; revenue: number; profit: number;
  profitMarginPct?: number;
}
export interface Competitor {
  id: string;
  companyId: string;
  name: string;
  asin?: string;
  skuId?: string;
  platform: string;
  productUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
export interface CompetitorSnapshot {
  id: string;
  competitorId: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  rank?: number;
  isInStock: boolean;
  snapshotAt: string;
  extra?: Record<string, any>;
}
export interface SkuFullDetail extends Sku {
  metrics?: SkuMetrics;
  competitors?: (Competitor & { latestSnapshot?: CompetitorSnapshot })[];
  alerts?: Alert[];
  recommendations?: Recommendation[];
}
export interface TrendPoint { date: string; sales: number; orders: number; }
export interface AdsTrendPoint { date: string; spend: number; acos: number; orders: number; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number; }
export interface ApiResponse<T> { code: number; message: string; data: T; }

export interface ShopeePriceInfo { mainPrice: number; subPrice: number; packingFee: number; taxFee: number; profitRate: number; currency: string; }
export interface TemuPriceInfo { supplyPrice: number; landingPrice: number; subPrice: number; packingFee: number; taxFee: number; profitRate: number; currency: string; }
export interface MercadolibrePriceInfo { mainPrice: number; subPrice: number; profitRate: number; currency: string; }
export interface PlatformPrices { shopee: ShopeePriceInfo | null; temu: TemuPriceInfo | null; mercadolibre: MercadolibrePriceInfo | null; }

export interface SkuFilters {
  storeId?: string; siteId?: string; status?: string; keyword?: string;
  sortBy?: string; sortOrder?: 'ASC' | 'DESC'; page?: number; pageSize?: number;
}

// ─── V2 Types ────────────────────────────────────────────────

export enum GateName { GATE_0='GATE_0', GATE_1='GATE_1', GATE_2='GATE_2', GATE_3='GATE_3', GRADUATED='GRADUATED', KILLED='KILLED' }
export enum TestStatus { ACTIVE='ACTIVE', GRADUATED='GRADUATED', KILLED='KILLED', PAUSED='PAUSED' }
export enum POStatus { DRAFT='DRAFT', SUBMITTED='SUBMITTED', CONFIRMED='CONFIRMED', IN_PRODUCTION='IN_PRODUCTION', SHIPPED='SHIPPED', RECEIVED='RECEIVED', CLOSED='CLOSED' }

export interface ProductTest {
  id: string; companyId: string; skuId: string; storeId?: string; siteId?: string;
  testName: string; currentGate: string; status: string;
  config: Record<string, any>; startedAt: string; graduatedAt?: string;
  killedAt?: string; killReason?: string; createdBy: string; createdAt: string;
  gates?: ProductTestGate[]; budgets?: ProductTestBudget[];
}
export interface ProductTestGate {
  id: string; testId: string; gateName: string; enteredAt: string; exitedAt?: string;
  exitDecision?: string; metricsAtEntry?: Record<string, any>; metricsAtExit?: Record<string, any>;
  criteria: Record<string, any>; decidedBy?: string;
}
export interface ProductTestBudget {
  id: string; testId: string; gateName: string;
  dailyBudgetLimit?: number; totalBudgetLimit?: number; spentToDate: number;
}
export interface GateMetrics {
  daysInGate: number; totalOrders: number; cvr: number; acos: number;
  organicOrderPct: number; marginPct: number; rating: number; returnRate: number;
  totalAdSpend: number; totalRevenue: number;
}

export interface DemandForecast {
  id: string; skuId: string; modelType: string; forecastDate: string;
  forecastHorizonDays: number; predictedUnits: number;
  confidenceLower?: number; confidenceUpper?: number;
  accuracyMetrics?: { mape: number; rmse: number; mae: number };
  createdAt: string;
}
export interface ReorderSuggestion {
  id: string; skuId: string; forecastId?: string; suggestedQty: number;
  suggestedOrderDate: string; leadTimeDays: number; safetyStockDays: number;
  estimatedCost?: number; status: string; actionId?: string; createdAt: string;
}

export interface Supplier {
  id: string; companyId: string; name: string; contactInfo?: Record<string, any>;
  paymentTerms?: string; leadTimeDays?: number; rating?: number; status: string;
  createdAt: string;
}
export interface PurchaseOrder {
  id: string; poNumber: string; supplierId: string; status: string;
  totalAmount?: number; currency: string; estimatedDelivery?: string;
  actualDelivery?: string; notes?: string; createdBy: string; createdAt: string;
  items?: PurchaseOrderItem[]; shipments?: Shipment[];
}
export interface PurchaseOrderItem {
  id: string; poId: string; skuId: string; quantity: number;
  unitPrice: number; receivedQty: number;
}
export interface Shipment {
  id: string; poId?: string; trackingNumber?: string; carrier?: string;
  method?: string; status: string; originWarehouse?: string;
  destinationWarehouse?: string; estimatedArrival?: string;
  actualArrival?: string; weightKg?: number; shippingCost?: number;
  createdAt: string;
}

export interface BudgetMigration {
  id: string; sourceCampaignId: string; targetCampaignId: string;
  sourceSkuId?: string; targetSkuId?: string;
  migratedAmount: number; sourceRoas: number; targetRoas: number;
  sourceDailyBudget: number; targetDailyBudget: number;
  status: string; actionId?: string;
  expectedImpact?: { roasGain: number; estimatedAdditionalRevenue: number };
  createdAt: string;
}
