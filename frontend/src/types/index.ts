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
export interface Site { id: string; code: string; name: string; currency: string; timezone: string; }
export interface Sku {
  id: string; companyId: string; sku: string; asin: string; storeId: string; siteId: string;
  title: string; category: string; costUnit: number; status: string;
  storeName?: string; siteName?: string;
}
export interface Alert {
  id: string; type: AlertType; severity: Severity; status: AlertStatus;
  skuId: string; title: string; message: string; evidenceJson: Record<string, unknown>;
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
  riskScore: number; requiresApproval: boolean; skuId: string;
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
}
export interface TrendPoint { date: string; sales: number; orders: number; }
export interface AdsTrendPoint { date: string; spend: number; acos: number; orders: number; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number; }
export interface ApiResponse<T> { code: number; message: string; data: T; }
