-- AI Commerce War OS - Database Schema
-- PostgreSQL 15+

BEGIN;

-- ============================================================
-- 1. Company & Auth
-- ============================================================

CREATE TABLE IF NOT EXISTS company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE IF NOT EXISTS role_permission (
  role_id UUID REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role (
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  role_id UUID REFERENCES role(id) ON DELETE CASCADE,
  store_id UUID,
  site_id UUID,
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- 2. Store & Site
-- ============================================================

CREATE TABLE IF NOT EXISTS store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  seller_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_site_binding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  marketplace_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  UNIQUE(store_id, site_id)
);

-- ============================================================
-- 3. SKU & Competitor
-- ============================================================

CREATE TABLE IF NOT EXISTS sku_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  sku VARCHAR(100) NOT NULL,
  asin VARCHAR(20),
  store_id UUID REFERENCES store(id),
  site_id UUID REFERENCES site(id),
  title TEXT,
  category VARCHAR(255),
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

CREATE TABLE IF NOT EXISTS competitor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  sku_id UUID REFERENCES sku_master(id),
  competitor_asin VARCHAR(20) NOT NULL,
  competitor_name VARCHAR(255),
  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  competitor_id UUID NOT NULL REFERENCES competitor(id),
  price DECIMAL(12,2),
  rank INT,
  rating DECIMAL(3,2),
  review_count INT,
  is_buybox BOOLEAN,
  snapshot_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_snap_time ON competitor_snapshot(competitor_id, snapshot_at);

-- ============================================================
-- 4. Metric Definition & Config
-- ============================================================

CREATE TABLE IF NOT EXISTS metric_def (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  name VARCHAR(100) NOT NULL,
  formula TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS metric_def_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_def_id UUID REFERENCES metric_def(id),
  version INT NOT NULL,
  formula TEXT NOT NULL,
  params JSONB,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_by UUID REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config_threshold (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  key VARCHAR(100) NOT NULL,
  value DECIMAL(12,4) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES "user"(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, key)
);

-- ============================================================
-- 5. Metric Snapshot & Fact Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS metric_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  sku_id UUID REFERENCES sku_master(id),
  store_id UUID REFERENCES store(id),
  site_id UUID REFERENCES site(id),
  metric_version_id UUID REFERENCES metric_def_version(id),
  window VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metric_snap ON metric_snapshot(sku_id, snapshot_at);

CREATE TABLE IF NOT EXISTS sales_fact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  sku_id UUID NOT NULL REFERENCES sku_master(id),
  store_id UUID NOT NULL REFERENCES store(id),
  site_id UUID NOT NULL REFERENCES site(id),
  period_type VARCHAR(10) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  units INT DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  refunds INT DEFAULT 0,
  refund_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_sku_period ON sales_fact(sku_id, period_type, period_start);

CREATE TABLE IF NOT EXISTS ads_fact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  sku_id UUID NOT NULL REFERENCES sku_master(id),
  store_id UUID NOT NULL REFERENCES store(id),
  site_id UUID NOT NULL REFERENCES site(id),
  campaign_id VARCHAR(100),
  adgroup_id VARCHAR(100),
  period_type VARCHAR(10) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  orders INT DEFAULT 0,
  sales DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ads_sku_period ON ads_fact(sku_id, period_type, period_start);

CREATE TABLE IF NOT EXISTS inventory_fact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  sku_id UUID NOT NULL REFERENCES sku_master(id),
  store_id UUID NOT NULL REFERENCES store(id),
  site_id UUID NOT NULL REFERENCES site(id),
  period_type VARCHAR(10) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  available INT DEFAULT 0,
  inbound INT DEFAULT 0,
  reserved INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_sku_period ON inventory_fact(sku_id, period_type, period_start);

-- ============================================================
-- 6. Alert & Recommendation
-- ============================================================

CREATE TABLE IF NOT EXISTS alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  sku_id UUID REFERENCES sku_master(id),
  store_id UUID REFERENCES store(id),
  site_id UUID REFERENCES site(id),
  title VARCHAR(500) NOT NULL,
  message TEXT,
  evidence_json JSONB,
  dedupe_key VARCHAR(128) UNIQUE NOT NULL,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  metric_version_id UUID REFERENCES metric_def_version(id),
  acknowledged_by UUID REFERENCES "user"(id),
  acknowledged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alert_company_status ON alert(company_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_sku ON alert(sku_id);

CREATE TABLE IF NOT EXISTS recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  alert_id UUID REFERENCES alert(id),
  sku_id UUID REFERENCES sku_master(id),
  rationale TEXT NOT NULL,
  evidence_json JSONB,
  expected_gain DECIMAL(12,2),
  risk_level VARCHAR(20) NOT NULL,
  suggested_actions JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  decided_by UUID REFERENCES "user"(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. Action, Approval, Execution, Rollback
-- ============================================================

CREATE TABLE IF NOT EXISTS action (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id),
  recommendation_id UUID REFERENCES recommendation(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'DRAFT',
  params JSONB,
  guardrails JSONB,
  risk_score INT DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  sku_id UUID REFERENCES sku_master(id),
  store_id UUID REFERENCES store(id),
  site_id UUID REFERENCES site(id),
  created_by UUID REFERENCES "user"(id),
  executed_at TIMESTAMPTZ,
  verification_result JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_status ON action(company_id, status);

CREATE TABLE IF NOT EXISTS approval (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action(id),
  approver_user_id UUID NOT NULL REFERENCES "user"(id),
  decision VARCHAR(20) NOT NULL,
  comment TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action(id),
  executed_by UUID REFERENCES "user"(id),
  result JSONB,
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rollback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action(id),
  rolled_back_by UUID REFERENCES "user"(id),
  previous_state JSONB,
  reason TEXT,
  rolled_back_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. Audit Log (append-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
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
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_log(company_id, created_at);

-- Prevent UPDATE/DELETE on audit_log
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: modifications are not allowed';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_log;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

COMMIT;
