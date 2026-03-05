/**
 * Test data factories for AI Commerce War OS.
 * All factory functions produce data consistent with actual entity definitions.
 */
import { v4 as uuidv4 } from 'uuid';
import {
  AlertType,
  Severity,
  AlertStatus,
  ActionType,
  ActionStatus,
  RiskLevel,
  RecommendationStatus,
  UserRole,
  StoreStatus,
  SkuStatus,
  MetricWindow,
} from '../../src/common/enums';

// ─── ID Generators ───────────────────────────────────────────

let counter = 0;
export function nextId(): string {
  return uuidv4();
}

export function nextCounter(): number {
  return ++counter;
}

// ─── Company & User Factories ────────────────────────────────

export function makeCompany(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    name: `Test Company ${nextCounter()}`,
    logo: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeUser(overrides: Partial<any> = {}) {
  const n = nextCounter();
  return {
    id: nextId(),
    email: `user${n}@test.com`,
    passwordHash: '$2b$10$hashedpassword',
    displayName: `Test User ${n}`,
    avatar: null,
    active: true,
    lastLoginAt: null,
    companyId: nextId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [],
    ...overrides,
  };
}

export function makeRole(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    name: UserRole.OPERATOR,
    description: 'Default operator role',
    createdAt: new Date(),
    permissions: [],
    ...overrides,
  };
}

export function makeUserRole(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    userId: nextId(),
    roleId: nextId(),
    assignedAt: new Date(),
    ...overrides,
  };
}

// ─── Store & Site Factories ──────────────────────────────────

export function makeStore(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    name: `Store ${nextCounter()}`,
    platform: 'AMAZON',
    sellerId: `SELLER_${nextCounter()}`,
    status: StoreStatus.ACTIVE,
    credentials: null,
    siteBindings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeSite(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    name: `Amazon US`,
    marketplaceCode: 'US',
    region: 'North America',
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── SKU Factory ─────────────────────────────────────────────

export function makeSku(overrides: Partial<any> = {}) {
  const n = nextCounter();
  return {
    id: nextId(),
    companyId: nextId(),
    sku: `SKU-${n}`,
    asin: `B00${n.toString().padStart(7, '0')}`,
    title: `Test Product ${n}`,
    category: 'Electronics',
    brand: 'TestBrand',
    price: 29.99,
    cost: 12.0,
    status: SkuStatus.ACTIVE,
    storeId: nextId(),
    siteId: nextId(),
    imageUrl: null,
    attributes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Competitor Factory ──────────────────────────────────────

export function makeCompetitor(overrides: Partial<any> = {}) {
  const n = nextCounter();
  return {
    id: nextId(),
    companyId: nextId(),
    name: `Competitor ${n}`,
    asin: `C00${n.toString().padStart(7, '0')}`,
    skuId: nextId(),
    platform: 'AMAZON',
    productUrl: `https://amazon.com/dp/C00${n}`,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Alert Factory ───────────────────────────────────────────

export function makeAlert(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    type: AlertType.STOCKOUT,
    severity: Severity.HIGH,
    status: AlertStatus.OPEN,
    skuId: nextId(),
    storeId: nextId(),
    siteId: nextId(),
    title: 'Test Alert',
    message: 'Test alert message',
    evidenceJson: { daysOfCover: 2 },
    dedupeKey: `dedupe-${nextCounter()}`,
    windowStart: new Date(),
    windowEnd: new Date(),
    metricVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Recommendation Factory ─────────────────────────────────

export function makeRecommendation(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    alertId: nextId(),
    skuId: nextId(),
    rationale: 'Test rationale for recommendation',
    evidenceJson: { metric: 'value' },
    expectedGain: 100.0,
    riskLevel: RiskLevel.MEDIUM,
    suggestedActions: [
      { type: ActionType.ADJUST_PRICE, label: 'Adjust price', params: {} },
    ],
    status: RecommendationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Action Factory ─────────────────────────────────────────

export function makeAction(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    recommendationId: nextId(),
    type: ActionType.ADJUST_PRICE,
    status: ActionStatus.DRAFT,
    params: { newPrice: 24.99 },
    guardrails: null,
    riskScore: 30,
    requiresApproval: true,
    skuId: nextId(),
    storeId: nextId(),
    siteId: nextId(),
    createdBy: nextId(),
    executedAt: null,
    verificationResult: null,
    approvals: [],
    executions: [],
    rollbacks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Threshold Factory ──────────────────────────────────────

export function makeThreshold(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    metricCode: 'daysOfCover',
    storeId: null,
    siteId: null,
    skuId: null,
    warnValue: 7,
    criticalValue: 3,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── MetricDef Factory ──────────────────────────────────────

export function makeMetricDef(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    code: `metric_${nextCounter()}`,
    name: 'Test Metric',
    description: 'A test metric definition',
    unit: '%',
    formula: 'a / b * 100',
    dataSource: 'ads_api',
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeMetricDefVersion(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    metricDefId: nextId(),
    version: 1,
    formula: 'spend / sales * 100',
    changelog: 'Initial version',
    isActive: true,
    effectiveFrom: new Date(),
    effectiveTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Audit Log Factory ──────────────────────────────────────

export function makeAuditLog(overrides: Partial<any> = {}) {
  return {
    id: nextId(),
    companyId: nextId(),
    userId: nextId(),
    entityType: 'Action',
    entityId: nextId(),
    actionPerformed: 'CREATE',
    details: {},
    ipAddress: '127.0.0.1',
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── SkuMetrics Factory (for rule engine) ────────────────────

export function makeSkuMetrics(overrides: Partial<any> = {}) {
  return {
    skuId: nextId(),
    asin: 'B001234567',
    storeId: nextId(),
    siteId: nextId(),
    available: 100,
    avgDailyUnits7d: 10,
    daysOfCover: 10,
    sales24h: 500,
    salesPrev24h: 480,
    adsSpend24h: 50,
    adsOrders24h: 5,
    acos24h: 25,
    tacos24h: 10,
    price: 29.99,
    prevPrice: 29.99,
    rank: 100,
    prevRank: 110,
    ...overrides,
  };
}

// ─── CompetitorSnapshot Factory (for rule engine) ────────────

export function makeCompetitorSnapshot(overrides: Partial<any> = {}) {
  return {
    competitorAsin: 'C001234567',
    price: 25.99,
    prevPrice: 28.99,
    rank: 50,
    prevRank: 80,
    reviewCount: 1500,
    prevReviewCount: 1490,
    avgDailyReviews: 5,
    rating: 4.3,
    ...overrides,
  };
}

// ─── MetricsSnapshot Factory (for verification engine) ───────

export function makeMetricsSnapshot(overrides: Partial<any> = {}) {
  return {
    price: 29.99,
    sales24h: 500,
    units24h: 20,
    rank: 100,
    adsSpend24h: 50,
    adsOrders24h: 5,
    acos: 25,
    tacos: 10,
    available: 200,
    snapshotAt: new Date(),
    ...overrides,
  };
}
