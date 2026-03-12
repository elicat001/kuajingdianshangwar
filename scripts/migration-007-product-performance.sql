-- 迁移007：商品表现数据表
CREATE TABLE IF NOT EXISTS product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL,
  sku_id VARCHAR NOT NULL,
  store_id VARCHAR NOT NULL,
  site_id VARCHAR NOT NULL,
  report_date DATE NOT NULL,
  page_views INT NOT NULL DEFAULT 0,
  sessions INT NOT NULL DEFAULT 0,
  buy_box_pct DECIMAL(8,4) NOT NULL DEFAULT 0,
  units_ordered INT NOT NULL DEFAULT 0,
  units_refunded INT NOT NULL DEFAULT 0,
  refund_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  rating DECIMAL(8,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pp_company_sku ON product_performance(company_id, sku_id);
CREATE INDEX IF NOT EXISTS idx_pp_report_date ON product_performance(report_date);
