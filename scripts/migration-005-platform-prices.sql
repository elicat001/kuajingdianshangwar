-- 迁移005：多平台定价表
CREATE TABLE IF NOT EXISTS sku_shopee_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL,
  sku_id VARCHAR NOT NULL,
  main_price DECIMAL(12,2),
  sub_price DECIMAL(12,2),
  packing_fee DECIMAL(12,2),
  tax_fee DECIMAL(12,2),
  profit_rate DECIMAL(8,2),
  currency VARCHAR(10),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(sku_id, company_id)
);

CREATE TABLE IF NOT EXISTS sku_temu_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL,
  sku_id VARCHAR NOT NULL,
  supply_price DECIMAL(12,2),
  landing_price DECIMAL(12,2),
  sub_price DECIMAL(12,2),
  packing_fee DECIMAL(12,2),
  tax_fee DECIMAL(12,2),
  profit_rate DECIMAL(8,2),
  currency VARCHAR(10),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(sku_id, company_id)
);

CREATE TABLE IF NOT EXISTS sku_mercadolibre_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL,
  sku_id VARCHAR NOT NULL,
  main_price DECIMAL(12,2),
  sub_price DECIMAL(12,2),
  profit_rate DECIMAL(8,2),
  currency VARCHAR(10),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(sku_id, company_id)
);

-- 数据上传记录表
CREATE TABLE IF NOT EXISTS data_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL,
  filename VARCHAR NOT NULL,
  data_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  message TEXT,
  row_count INT NOT NULL DEFAULT 0,
  created_by VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
