-- AI Commerce War OS - Seed Data
BEGIN;

-- ============================================================
-- Company
-- ============================================================
INSERT INTO company (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Demo Cross-Border Corp');

-- ============================================================
-- Roles
-- ============================================================
INSERT INTO role (id, name, description) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator'),
  ('b0000000-0000-0000-0000-000000000002', 'ADMIN', 'Company Administrator'),
  ('b0000000-0000-0000-0000-000000000003', 'MANAGER', 'Operations Manager'),
  ('b0000000-0000-0000-0000-000000000004', 'OPERATOR', 'Operator'),
  ('b0000000-0000-0000-0000-000000000005', 'VIEWER', 'Read-only Viewer');

-- ============================================================
-- Permissions
-- ============================================================
INSERT INTO permission (id, resource, action) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'alerts', 'read'),
  ('c0000000-0000-0000-0000-000000000002', 'alerts', 'write'),
  ('c0000000-0000-0000-0000-000000000003', 'actions', 'read'),
  ('c0000000-0000-0000-0000-000000000004', 'actions', 'write'),
  ('c0000000-0000-0000-0000-000000000005', 'actions', 'approve'),
  ('c0000000-0000-0000-0000-000000000006', 'skus', 'read'),
  ('c0000000-0000-0000-0000-000000000007', 'skus', 'write'),
  ('c0000000-0000-0000-0000-000000000008', 'settings', 'read'),
  ('c0000000-0000-0000-0000-000000000009', 'settings', 'write'),
  ('c0000000-0000-0000-0000-000000000010', 'users', 'manage');

-- Admin has all permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000001', id FROM permission;
INSERT INTO role_permission (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000002', id FROM permission;

-- Manager: alerts, actions, skus, settings read
INSERT INTO role_permission (role_id, permission_id) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000007'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000008');

-- ============================================================
-- Users (password: admin123 → bcrypt hash)
-- ============================================================
INSERT INTO "user" (id, company_id, email, password_hash, name) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin@demo.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'Admin'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'manager@demo.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'Manager Wang'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'operator@demo.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'Operator Li');

INSERT INTO user_role (user_id, role_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004');

-- ============================================================
-- Stores & Sites
-- ============================================================
INSERT INTO store (id, company_id, name, platform, seller_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Demo US Store', 'AMAZON', 'A1SELLER001'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Demo UK Store', 'AMAZON', 'A1SELLER002');

INSERT INTO site (id, company_id, code, name, currency, timezone) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'US', 'United States', 'USD', 'America/Los_Angeles'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'UK', 'United Kingdom', 'GBP', 'Europe/London');

INSERT INTO store_site_binding (store_id, site_id, marketplace_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'ATVPDKIKX0DER'),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'A1F83G8C2ARO7P');

-- ============================================================
-- SKUs
-- ============================================================
INSERT INTO sku_master (id, company_id, sku, asin, store_id, site_id, title, category, cost_unit, weight_kg, lead_time_days) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'WH-001-US', 'B0CK1XNRGH', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Wireless Headphones Pro', 'Electronics', 12.50, 0.350, 25),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'KB-002-US', 'B0CL2YMTJK', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Mechanical Keyboard RGB', 'Electronics', 18.00, 0.800, 30),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'YM-003-US', 'B0CM3ZNUKL', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Yoga Mat Premium 6mm', 'Sports', 5.50, 1.200, 35),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'WB-004-US', 'B0CN4AOVLM', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Water Bottle Insulated 32oz', 'Kitchen', 3.20, 0.450, 20),
  ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'PH-005-US', 'B0CP5BPWMN', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Phone Stand Adjustable', 'Electronics', 2.80, 0.200, 20),
  ('10000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'WH-001-UK', 'B0CK1XNRGH', 'e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'Wireless Headphones Pro', 'Electronics', 12.50, 0.350, 30),
  ('10000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'KB-002-UK', 'B0CL2YMTJK', 'e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'Mechanical Keyboard RGB', 'Electronics', 18.00, 0.800, 35),
  ('10000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'LP-008-US', 'B0CQ6CQXNO', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'LED Desk Lamp Touch', 'Home', 8.00, 0.600, 25),
  ('10000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'BB-009-US', 'B0CR7DRYOP', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Bluetooth Speaker Mini', 'Electronics', 9.00, 0.300, 20),
  ('10000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'CT-010-US', 'B0CS8ESZPQ', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Camping Tent 2-Person', 'Outdoors', 25.00, 2.500, 40);

-- ============================================================
-- Competitors
-- ============================================================
INSERT INTO competitor (id, company_id, sku_id, competitor_asin, competitor_name, source) VALUES
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'B0AA1COMP1', 'SoundMax Headphones', 'manual'),
  ('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'B0AA2COMP2', 'AudioPro Wireless', 'manual'),
  ('20000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'B0BB1COMP3', 'KeyMaster RGB KB', 'manual'),
  ('20000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'B0CC1COMP4', 'FlexYoga Premium Mat', 'manual'),
  ('20000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'B0DD1COMP5', 'HydroFlask Bottle 32', 'manual');

-- Competitor snapshots
INSERT INTO competitor_snapshot (company_id, competitor_id, price, rank, rating, review_count, is_buybox, snapshot_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 29.99, 150, 4.30, 2500, true, NOW() - INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 34.99, 220, 4.10, 1800, false, NOW() - INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 49.99, 80, 4.50, 3200, true, NOW() - INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 19.99, 45, 4.60, 5000, true, NOW() - INTERVAL '1 hour'),
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 24.99, 30, 4.70, 8000, true, NOW() - INTERVAL '1 hour');

-- ============================================================
-- Config Thresholds
-- ============================================================
INSERT INTO config_threshold (company_id, key, value, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'stockout_days_high', 3, 'High severity stockout threshold (days)'),
  ('a0000000-0000-0000-0000-000000000001', 'stockout_days_med', 7, 'Medium severity stockout threshold (days)'),
  ('a0000000-0000-0000-0000-000000000001', 'slow_moving_days', 90, 'Slow-moving inventory threshold (days)'),
  ('a0000000-0000-0000-0000-000000000001', 'ads_waste_spend', 50, 'Minimum spend to trigger waste alert (USD)'),
  ('a0000000-0000-0000-0000-000000000001', 'ads_waste_acos', 50, 'ACOS threshold for waste alert (%)'),
  ('a0000000-0000-0000-0000-000000000001', 'acos_anomaly_stddev', 2, 'Standard deviations for ACOS anomaly'),
  ('a0000000-0000-0000-0000-000000000001', 'competitor_price_drop_pct', 10, 'Competitor price drop threshold (%)'),
  ('a0000000-0000-0000-0000-000000000001', 'competitor_rank_change', 50, 'Competitor rank change threshold'),
  ('a0000000-0000-0000-0000-000000000001', 'review_anomaly_multiplier', 3, 'Review growth anomaly multiplier'),
  ('a0000000-0000-0000-0000-000000000001', 'price_max_delta_pct', 3, 'Max price change per action (%)'),
  ('a0000000-0000-0000-0000-000000000001', 'price_min_margin_floor', 15, 'Minimum margin floor (%)'),
  ('a0000000-0000-0000-0000-000000000001', 'price_cooldown_hours', 6, 'Price change cooldown (hours)'),
  ('a0000000-0000-0000-0000-000000000001', 'price_max_changes_per_day', 2, 'Max price changes per day'),
  ('a0000000-0000-0000-0000-000000000001', 'budget_max_delta_pct', 20, 'Max budget adjustment (%)'),
  ('a0000000-0000-0000-0000-000000000001', 'batch_max_impact_usd', 5000, 'Max batch impact (USD)');

-- ============================================================
-- Sample Sales Data (last 7 days, daily for SKU 1)
-- ============================================================
INSERT INTO sales_fact (company_id, sku_id, store_id, site_id, period_type, period_start, units, revenue) VALUES
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW() - INTERVAL '7 days', 45, 1345.55),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW() - INTERVAL '6 days', 52, 1554.48),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW() - INTERVAL '5 days', 38, 1136.62),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW() - INTERVAL '4 days', 60, 1793.40),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW() - INTERVAL '3 days', 55, 1643.45),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW() - INTERVAL '2 days', 48, 1434.72),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW() - INTERVAL '1 day', 42, 1255.38);

-- Sample Ads Data
INSERT INTO ads_fact (company_id, sku_id, store_id, site_id, campaign_id, adgroup_id, period_type, period_start, impressions, clicks, spend, orders, sales) VALUES
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'CAMP001', 'AG001', 'DAILY', NOW() - INTERVAL '3 days', 15000, 450, 120.50, 18, 538.20),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'CAMP001', 'AG001', 'DAILY', NOW() - INTERVAL '2 days', 14500, 420, 115.80, 15, 448.50),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'CAMP001', 'AG001', 'DAILY', NOW() - INTERVAL '1 day', 16000, 480, 135.20, 20, 598.00),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'CAMP002', 'AG002', 'DAILY', NOW() - INTERVAL '1 day', 8000, 200, 85.00, 0, 0);

-- Sample Inventory Data
INSERT INTO inventory_fact (company_id, sku_id, store_id, site_id, period_type, period_start, available, inbound, reserved) VALUES
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW(), 350, 200, 10),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW(), 15, 0, 2),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW(), 500, 0, 5),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW(), 8, 100, 0),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'DAILY', NOW(), 1200, 0, 20);

-- ============================================================
-- Sample Alerts
-- ============================================================
INSERT INTO alert (company_id, type, severity, status, sku_id, store_id, site_id, title, message, evidence_json, dedupe_key, window_start, window_end) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'STOCKOUT', 'HIGH', 'OPEN', '10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'KB-002-US: Critical Low Stock', 'Days of cover: 2.1 days. Immediate reorder needed.', '{"available": 15, "avg7d": 7.2, "daysOfCover": 2.1}', 'stockout_high_10000002_20260305', NOW() - INTERVAL '2 hours', NOW()),
  ('a0000000-0000-0000-0000-000000000001', 'STOCKOUT', 'MEDIUM', 'OPEN', '10000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'WB-004-US: Low Stock Warning', 'Days of cover: 5.3 days.', '{"available": 8, "avg7d": 1.5, "daysOfCover": 5.3}', 'stockout_med_10000004_20260305', NOW() - INTERVAL '1 hour', NOW()),
  ('a0000000-0000-0000-0000-000000000001', 'ADS_WASTE', 'HIGH', 'OPEN', '10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'KB-002-US: Ad Spend with Zero Orders', 'Campaign CAMP002/AG002: $85 spent, 0 orders in last 24h.', '{"spend": 85, "orders": 0, "clicks": 200, "impressions": 8000}', 'adswaste_zero_10000002_20260305', NOW() - INTERVAL '30 minutes', NOW()),
  ('a0000000-0000-0000-0000-000000000001', 'COMPETITOR_PRICE_DROP', 'MEDIUM', 'ACKNOWLEDGED', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'WH-001-US: Competitor Price Drop 15%', 'SoundMax dropped from $34.99 to $29.99.', '{"competitor": "SoundMax", "oldPrice": 34.99, "newPrice": 29.99, "dropPct": 14.3}', 'compprice_20000001_20260305', NOW() - INTERVAL '5 hours', NOW());

-- ============================================================
-- Sample Recommendations
-- ============================================================
INSERT INTO recommendation (company_id, alert_id, sku_id, rationale, evidence_json, expected_gain, risk_level, suggested_actions, status)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  a.id,
  a.sku_id,
  CASE a.type
    WHEN 'STOCKOUT' THEN 'Immediate reorder recommended based on current velocity and lead time.'
    WHEN 'ADS_WASTE' THEN 'Pause underperforming ad group and add negative keywords to reduce waste.'
    WHEN 'COMPETITOR_PRICE_DROP' THEN 'Consider defending position with minor price adjustment within margin guardrails.'
  END,
  a.evidence_json,
  CASE a.type WHEN 'STOCKOUT' THEN 0 WHEN 'ADS_WASTE' THEN 85 WHEN 'COMPETITOR_PRICE_DROP' THEN 50 END,
  CASE a.severity WHEN 'HIGH' THEN 'HIGH' WHEN 'MEDIUM' THEN 'MEDIUM' ELSE 'LOW' END,
  CASE a.type
    WHEN 'STOCKOUT' THEN '[{"type": "CREATE_REORDER", "params": {"qty": 200, "urgency": "high"}}]'::jsonb
    WHEN 'ADS_WASTE' THEN '[{"type": "PAUSE_ADGROUP", "params": {"adgroupId": "AG002"}}, {"type": "ADD_NEGATIVE_KEYWORD", "params": {"keywords": ["cheap", "free"]}}]'::jsonb
    WHEN 'COMPETITOR_PRICE_DROP' THEN '[{"type": "ADJUST_PRICE", "params": {"strategy": "defend_margin", "maxDeltaPct": 3}}]'::jsonb
  END,
  'PENDING'
FROM alert a
WHERE a.company_id = 'a0000000-0000-0000-0000-000000000001';

COMMIT;
