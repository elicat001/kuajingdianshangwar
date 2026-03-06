-- Migration 001: Add UNIQUE constraints, missing indexes, and ON DELETE RESTRICT
-- Run against PostgreSQL 15+

BEGIN;

-- ============================================================
-- 1. UNIQUE constraints
-- ============================================================

-- Prevent duplicate SKU per company
ALTER TABLE sku_master
  ADD CONSTRAINT uq_sku_company UNIQUE (company_id, sku);

-- Prevent duplicate site code per company
ALTER TABLE sites
  ADD CONSTRAINT uq_site_company_code UNIQUE (company_id, code);

-- Prevent duplicate permission per role
ALTER TABLE permissions
  ADD CONSTRAINT uq_permission_role_resource_action UNIQUE (role_id, resource, action);

-- ============================================================
-- 2. Missing indexes for query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_config_thresh_company_metric
  ON config_thresholds(company_id, metric_code);

CREATE INDEX IF NOT EXISTS idx_recommendations_alert
  ON recommendations(alert_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_sku
  ON recommendations(sku_id);

CREATE INDEX IF NOT EXISTS idx_approvals_action
  ON approvals(action_id);

CREATE INDEX IF NOT EXISTS idx_executions_action
  ON executions(action_id);

CREATE INDEX IF NOT EXISTS idx_rollbacks_action
  ON rollbacks(action_id);

CREATE INDEX IF NOT EXISTS idx_metric_snap_company_code
  ON metric_snapshots(company_id, metric_code);

CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_store_site_bindings_company
  ON store_site_bindings(company_id);

-- ============================================================
-- 3. Foreign key ON DELETE policies
-- ============================================================

-- stores.company_id → RESTRICT (prevent orphan stores)
ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_company_id_fkey,
  ADD CONSTRAINT stores_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- sites.company_id → RESTRICT
ALTER TABLE sites
  DROP CONSTRAINT IF EXISTS sites_company_id_fkey,
  ADD CONSTRAINT sites_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- sku_master.company_id → RESTRICT
ALTER TABLE sku_master
  DROP CONSTRAINT IF EXISTS sku_master_company_id_fkey,
  ADD CONSTRAINT sku_master_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- sku_master.store_id → RESTRICT (can't delete store with SKUs)
ALTER TABLE sku_master
  DROP CONSTRAINT IF EXISTS sku_master_store_id_fkey,
  ADD CONSTRAINT sku_master_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT;

-- sku_master.site_id → RESTRICT
ALTER TABLE sku_master
  DROP CONSTRAINT IF EXISTS sku_master_site_id_fkey,
  ADD CONSTRAINT sku_master_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT;

-- competitors.company_id → RESTRICT
ALTER TABLE competitors
  DROP CONSTRAINT IF EXISTS competitors_company_id_fkey,
  ADD CONSTRAINT competitors_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- competitors.sku_id → CASCADE (delete competitors when SKU is removed)
ALTER TABLE competitors
  DROP CONSTRAINT IF EXISTS competitors_sku_id_fkey,
  ADD CONSTRAINT competitors_sku_id_fkey
    FOREIGN KEY (sku_id) REFERENCES sku_master(id) ON DELETE CASCADE;

-- alerts.company_id → RESTRICT
ALTER TABLE alerts
  DROP CONSTRAINT IF EXISTS alerts_company_id_fkey,
  ADD CONSTRAINT alerts_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- actions.company_id → RESTRICT
ALTER TABLE actions
  DROP CONSTRAINT IF EXISTS actions_company_id_fkey,
  ADD CONSTRAINT actions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- actions.recommendation_id → SET NULL (recommendation can be deleted independently)
ALTER TABLE actions
  DROP CONSTRAINT IF EXISTS actions_recommendation_id_fkey,
  ADD CONSTRAINT actions_recommendation_id_fkey
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL;

-- approvals.action_id → CASCADE
ALTER TABLE approvals
  DROP CONSTRAINT IF EXISTS approvals_action_id_fkey,
  ADD CONSTRAINT approvals_action_id_fkey
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE;

-- executions.action_id → CASCADE
ALTER TABLE executions
  DROP CONSTRAINT IF EXISTS executions_action_id_fkey,
  ADD CONSTRAINT executions_action_id_fkey
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE;

-- rollbacks.action_id → CASCADE
ALTER TABLE rollbacks
  DROP CONSTRAINT IF EXISTS rollbacks_action_id_fkey,
  ADD CONSTRAINT rollbacks_action_id_fkey
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE;

-- competitor_snapshots.competitor_id → CASCADE
ALTER TABLE competitor_snapshots
  DROP CONSTRAINT IF EXISTS competitor_snapshots_competitor_id_fkey,
  ADD CONSTRAINT competitor_snapshots_competitor_id_fkey
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE;

COMMIT;
