-- Migration 003: Time-series table partitioning (advisory)
--
-- PostgreSQL does not support ALTER TABLE ... SET PARTITION BY on existing tables.
-- This migration creates new partitioned tables, migrates data, then swaps.
-- Run during a maintenance window. Adjust partition ranges as needed.
--
-- Partitioning strategy: RANGE by report_date (monthly partitions)

BEGIN;

-- ============================================================
-- 1. sales_facts → partitioned by report_date
-- ============================================================

ALTER TABLE sales_facts RENAME TO sales_facts_old;

CREATE TABLE sales_facts (
  id UUID DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  sku_id UUID NOT NULL,
  store_id UUID NOT NULL,
  site_id UUID NOT NULL,
  report_date DATE NOT NULL,
  units_ordered INT DEFAULT 0,
  units_shipped INT DEFAULT 0,
  ordered_revenue DECIMAL(12,2) DEFAULT 0,
  shipped_revenue DECIMAL(12,2) DEFAULT 0,
  page_views INT DEFAULT 0,
  sessions INT DEFAULT 0,
  conversion_rate DECIMAL(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, report_date)
) PARTITION BY RANGE (report_date);

-- Create monthly partitions for 2024-2026
DO $$
DECLARE
  start_date DATE := '2024-01-01';
  end_date DATE;
  part_name TEXT;
BEGIN
  FOR i IN 0..35 LOOP
    end_date := start_date + INTERVAL '1 month';
    part_name := 'sales_facts_' || to_char(start_date, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF sales_facts FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date
    );
    start_date := end_date;
  END LOOP;
END $$;

INSERT INTO sales_facts SELECT * FROM sales_facts_old;
DROP TABLE sales_facts_old;

CREATE INDEX IF NOT EXISTS idx_sales_sku_date ON sales_facts(sku_id, report_date);
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON sales_facts(company_id, report_date);

-- ============================================================
-- 2. ads_facts → partitioned by report_date
-- ============================================================

ALTER TABLE ads_facts RENAME TO ads_facts_old;

CREATE TABLE ads_facts (
  id UUID DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  sku_id UUID NOT NULL,
  store_id UUID NOT NULL,
  site_id UUID NOT NULL,
  report_date DATE NOT NULL,
  campaign_id VARCHAR(100),
  adgroup_id VARCHAR(100),
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  ad_spend DECIMAL(12,2) DEFAULT 0,
  ad_orders INT DEFAULT 0,
  ad_revenue DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, report_date)
) PARTITION BY RANGE (report_date);

DO $$
DECLARE
  start_date DATE := '2024-01-01';
  end_date DATE;
  part_name TEXT;
BEGIN
  FOR i IN 0..35 LOOP
    end_date := start_date + INTERVAL '1 month';
    part_name := 'ads_facts_' || to_char(start_date, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF ads_facts FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date
    );
    start_date := end_date;
  END LOOP;
END $$;

INSERT INTO ads_facts SELECT * FROM ads_facts_old;
DROP TABLE ads_facts_old;

CREATE INDEX IF NOT EXISTS idx_ads_sku_date ON ads_facts(sku_id, report_date);
CREATE INDEX IF NOT EXISTS idx_ads_company_date ON ads_facts(company_id, report_date);

-- ============================================================
-- 3. inventory_facts → partitioned by report_date
-- ============================================================

ALTER TABLE inventory_facts RENAME TO inventory_facts_old;

CREATE TABLE inventory_facts (
  id UUID DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  sku_id UUID NOT NULL,
  store_id UUID NOT NULL,
  site_id UUID NOT NULL,
  report_date DATE NOT NULL,
  fulfillable_qty INT DEFAULT 0,
  inbound_qty INT DEFAULT 0,
  reserved_qty INT DEFAULT 0,
  unfulfillable_qty INT DEFAULT 0,
  days_of_supply INT,
  is_stockout BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, report_date)
) PARTITION BY RANGE (report_date);

DO $$
DECLARE
  start_date DATE := '2024-01-01';
  end_date DATE;
  part_name TEXT;
BEGIN
  FOR i IN 0..35 LOOP
    end_date := start_date + INTERVAL '1 month';
    part_name := 'inventory_facts_' || to_char(start_date, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF inventory_facts FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date
    );
    start_date := end_date;
  END LOOP;
END $$;

INSERT INTO inventory_facts SELECT * FROM inventory_facts_old;
DROP TABLE inventory_facts_old;

CREATE INDEX IF NOT EXISTS idx_inv_sku_date ON inventory_facts(sku_id, report_date);
CREATE INDEX IF NOT EXISTS idx_inv_company_date ON inventory_facts(company_id, report_date);

COMMIT;
