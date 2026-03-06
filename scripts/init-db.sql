-- AI Commerce War OS - Database Schema
-- PostgreSQL 15+
-- Table names aligned with TypeORM Entity @Entity() decorators

BEGIN;

-- ============================================================
-- 1. Company & Auth
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- ============================================================
-- 2. Store & Site
-- ============================================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  seller_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  marketplace_code VARCHAR(50),
  currency VARCHAR(3) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_site_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  marketplace_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, site_id)
);

-- ============================================================
-- 3. SKU & Competitor
-- ============================================================

CREATE TABLE IF NOT EXISTS sku_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  sku VARCHAR(100) NOT NULL,
  asin VARCHAR(20),
  store_id UUID REFERENCES stores(id),
  site_id UUID REFERENCES sites(id),
  title TEXT,
  category VARCHAR(255),
  image_url TEXT,
  cost_unit DECIMAL(12,2),
  weight_kg DECIMAL(8,3),
  lead_time_days INT DEFAULT 30,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sku_company ON sku_master(company_id);
CREATE INDEX IF NOT EXISTS idx_sku_store_site ON sku_master(store_id, site_id);
CREATE INDEX IF NOT EXISTS idx_sku_asin ON sku_master(asin);

CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  sku_id UUID REFERENCES sku_master(id),
  competitor_asin VARCHAR(20) NOT NULL,
  competitor_name VARCHAR(255),
  product_url TEXT,
  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  competitor_id UUID NOT NULL REFERENCES competitors(id),
  price DECIMAL(12,2),
  rank INT,
  rating DECIMAL(3,2),
  review_count INT,
  is_in_stock BOOLEAN,
  is_buybox BOOLEAN,
  snapshot_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_snap_time ON competitor_snapshots(competitor_id, snapshot_at);

-- ============================================================
-- 4. Metric Definition & Config
-- ============================================================

CREATE TABLE IF NOT EXISTS metric_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(100),
  data_source VARCHAR(100),
  formula TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metric_def_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  metric_def_id UUID REFERENCES metric_defs(id),
  version INT NOT NULL,
  formula TEXT NOT NULL,
  params JSONB,
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  metric_code VARCHAR(100) NOT NULL,
  store_id UUID REFERENCES stores(id),
  site_id UUID REFERENCES sites(id),
  sku_id UUID REFERENCES sku_master(id),
  warn_value DECIMAL(12,4),
  critical_value DECIMAL(12,4),
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, metric_code, store_id, site_id, sku_id)
);

-- ============================================================
-- 5. Metric Snapshot & Fact Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  metric_code VARCHAR(100),
  sku_id UUID REFERENCES sku_master(id),
  store_id UUID REFERENCES stores(id),
  site_id UUID REFERENCES sites(id),
  "window" VARCHAR(20) NOT NULL,
  value DECIMAL(18,4),
  data JSONB,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  metric_version_id UUID REFERENCES metric_def_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metric_snap ON metric_snapshots(sku_id, created_at);

CREATE TABLE IF NOT EXISTS sales_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  sku_id UUID NOT NULL REFERENCES sku_master(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  report_date DATE NOT NULL,
  units_ordered INT DEFAULT 0,
  units_shipped INT DEFAULT 0,
  ordered_revenue DECIMAL(12,2) DEFAULT 0,
  shipped_revenue DECIMAL(12,2) DEFAULT 0,
  page_views INT DEFAULT 0,
  sessions INT DEFAULT 0,
  conversion_rate DECIMAL(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_sku_date ON sales_facts(sku_id, report_date);

CREATE TABLE IF NOT EXISTS ads_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  sku_id UUID NOT NULL REFERENCES sku_master(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  report_date DATE NOT NULL,
  campaign_id VARCHAR(100),
  adgroup_id VARCHAR(100),
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  ad_spend DECIMAL(12,2) DEFAULT 0,
  ad_orders INT DEFAULT 0,
  ad_revenue DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ads_sku_date ON ads_facts(sku_id, report_date);

CREATE TABLE IF NOT EXISTS inventory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  sku_id UUID NOT NULL REFERENCES sku_master(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  report_date DATE NOT NULL,
  fulfillable_qty INT DEFAULT 0,
  inbound_qty INT DEFAULT 0,
  reserved_qty INT DEFAULT 0,
  unfulfillable_qty INT DEFAULT 0,
  days_of_supply INT,
  is_stockout BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_sku_date ON inventory_facts(sku_id, report_date);

-- ============================================================
-- 6. Alert & Recommendation
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  sku_id UUID REFERENCES sku_master(id),
  store_id UUID REFERENCES stores(id),
  site_id UUID REFERENCES sites(id),
  title VARCHAR(500) NOT NULL,
  message TEXT,
  evidence_json JSONB,
  dedupe_key VARCHAR(128) UNIQUE NOT NULL,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  metric_version_id UUID REFERENCES metric_def_versions(id),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alert_company_status ON alerts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_sku ON alerts(sku_id);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  alert_id UUID REFERENCES alerts(id),
  sku_id UUID REFERENCES sku_master(id),
  rationale TEXT NOT NULL,
  evidence_json JSONB,
  expected_gain DECIMAL(12,2),
  risk_level VARCHAR(20) NOT NULL,
  suggested_actions JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. Action, Approval, Execution, Rollback
-- ============================================================

CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  recommendation_id UUID REFERENCES recommendations(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'DRAFT',
  params JSONB,
  guardrails JSONB,
  risk_score DECIMAL(5,2) DEFAULT 0,
  requires_approval BOOLEAN DEFAULT true,
  sku_id UUID REFERENCES sku_master(id),
  store_id UUID REFERENCES stores(id),
  site_id UUID REFERENCES sites(id),
  created_by UUID REFERENCES users(id),
  executed_at TIMESTAMPTZ,
  verification_result JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_status ON actions(company_id, status);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  action_id UUID NOT NULL REFERENCES actions(id),
  approver_user_id UUID NOT NULL REFERENCES users(id),
  decision VARCHAR(20) NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  action_id UUID NOT NULL REFERENCES actions(id),
  executed_by UUID REFERENCES users(id),
  result JSONB,
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  action_id UUID NOT NULL REFERENCES actions(id),
  rolled_back_by UUID REFERENCES users(id),
  previous_state JSONB,
  reason TEXT,
  rolled_back_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. Audit Log (append-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  action_performed VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id, created_at);

-- Prevent UPDATE/DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: modifications are not allowed';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_logs;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================
-- 9. Additional Indexes for Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stores_company ON stores(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_competitors_company ON competitors(company_id);
CREATE INDEX IF NOT EXISTS idx_actions_created_by ON actions(created_by);
CREATE INDEX IF NOT EXISTS idx_recommendations_company ON recommendations(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON sales_facts(company_id, report_date);
CREATE INDEX IF NOT EXISTS idx_ads_company_date ON ads_facts(company_id, report_date);
CREATE INDEX IF NOT EXISTS idx_inv_company_date ON inventory_facts(company_id, report_date);

COMMIT;
