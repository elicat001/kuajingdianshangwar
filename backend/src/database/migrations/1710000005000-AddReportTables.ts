import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportTables1710000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== SKU Sales Reports =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sku_sales_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        sku_code VARCHAR(128) NOT NULL DEFAULT '',
        product_name VARCHAR(255) DEFAULT '',
        store_name VARCHAR(128) DEFAULT '',
        platform VARCHAR(64) DEFAULT '',
        raw_shop VARCHAR(256) DEFAULT '',
        variant_id VARCHAR(128) DEFAULT '',
        quantity NUMERIC NOT NULL DEFAULT 0,
        sales_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        avg_price DECIMAL(14,4),
        report_period VARCHAR(64) DEFAULT '',
        report_date DATE,
        extra_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_ssr_company_sku ON sku_sales_reports(company_id, sku_code);
      CREATE INDEX idx_ssr_company_store_date ON sku_sales_reports(company_id, store_name, report_date);
      CREATE INDEX idx_ssr_company_period ON sku_sales_reports(company_id, report_period);
    `);

    // ===== Inventory Reports =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        sku_code VARCHAR(128) NOT NULL DEFAULT '',
        title VARCHAR(255) DEFAULT '',
        warehouse VARCHAR(128) DEFAULT '',
        shelf_location VARCHAR(128) DEFAULT '',
        low_stock NUMERIC DEFAULT 0,
        purchase_in_transit NUMERIC DEFAULT 0,
        transfer_in_transit NUMERIC DEFAULT 0,
        occupied_qty NUMERIC DEFAULT 0,
        available_stock NUMERIC DEFAULT 0,
        current_stock NUMERIC DEFAULT 0,
        avg_cost DECIMAL(14,4),
        subtotal DECIMAL(14,2) DEFAULT 0,
        report_period VARCHAR(64) DEFAULT '',
        report_date DATE,
        extra_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_ir_company_sku ON inventory_reports(company_id, sku_code);
      CREATE INDEX idx_ir_company_warehouse ON inventory_reports(company_id, warehouse);
      CREATE INDEX idx_ir_company_date ON inventory_reports(company_id, report_date);
    `);

    // ===== Promotion Fee Reports =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promotion_fee_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        report_date VARCHAR(64) DEFAULT '',
        store_name VARCHAR(128) DEFAULT '',
        platform VARCHAR(64) DEFAULT '',
        sku_code VARCHAR(128) DEFAULT '',
        campaign_name VARCHAR(255) DEFAULT '',
        rank_order VARCHAR(64) DEFAULT '',
        status VARCHAR(64) DEFAULT '',
        ad_type VARCHAR(64) DEFAULT '',
        creation VARCHAR(255) DEFAULT '',
        bid_type VARCHAR(64) DEFAULT '',
        placement VARCHAR(64) DEFAULT '',
        end_date VARCHAR(64) DEFAULT '',
        promotion_fee DECIMAL(14,2) DEFAULT 0,
        impressions NUMERIC DEFAULT 0,
        clicks NUMERIC DEFAULT 0,
        ctr DECIMAL(10,4) DEFAULT 0,
        orders NUMERIC DEFAULT 0,
        direct_conversion NUMERIC DEFAULT 0,
        conversion_rate DECIMAL(10,4) DEFAULT 0,
        direct_conversion_rate DECIMAL(10,4) DEFAULT 0,
        cost_per_conversion DECIMAL(14,4) DEFAULT 0,
        cost_per_direct_conversion DECIMAL(14,4) DEFAULT 0,
        quantity_sold NUMERIC DEFAULT 0,
        direct_quantity_sold NUMERIC DEFAULT 0,
        sales_amount DECIMAL(14,2) DEFAULT 0,
        direct_sales_amount DECIMAL(14,2) DEFAULT 0,
        roas DECIMAL(10,4) DEFAULT 0,
        direct_roas DECIMAL(10,4) DEFAULT 0,
        ad_sales_cost DECIMAL(10,4) DEFAULT 0,
        direct_ad_sales_cost DECIMAL(10,4) DEFAULT 0,
        product_impressions NUMERIC DEFAULT 0,
        product_clicks NUMERIC DEFAULT 0,
        product_ctr DECIMAL(10,4) DEFAULT 0,
        report_period VARCHAR(64) DEFAULT '',
        extra_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_pfr_company_sku_date ON promotion_fee_reports(company_id, sku_code, report_date);
      CREATE INDEX idx_pfr_company_store ON promotion_fee_reports(company_id, store_name);
      CREATE INDEX idx_pfr_company_period ON promotion_fee_reports(company_id, report_period);
    `);

    // ===== Product Performance Reports =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_performance_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        report_date VARCHAR(64) DEFAULT '',
        store_name VARCHAR(128) DEFAULT '',
        platform VARCHAR(64) DEFAULT '',
        sku_code VARCHAR(128) DEFAULT '',
        product_name VARCHAR(255) DEFAULT '',
        item_status VARCHAR(64) DEFAULT '',
        variation_id VARCHAR(128) DEFAULT '',
        variation_name VARCHAR(255) DEFAULT '',
        variation_status VARCHAR(64) DEFAULT '',
        variation_sku VARCHAR(128) DEFAULT '',
        global_sku VARCHAR(128) DEFAULT '',
        sales_amount_placed DECIMAL(14,2) DEFAULT 0,
        sales_amount DECIMAL(14,2) DEFAULT 0,
        orders_placed NUMERIC DEFAULT 0,
        orders NUMERIC DEFAULT 0,
        quantity_placed NUMERIC DEFAULT 0,
        quantity NUMERIC DEFAULT 0,
        buyers_placed NUMERIC DEFAULT 0,
        buyers_paid NUMERIC DEFAULT 0,
        order_cvr_placed DECIMAL(10,4) DEFAULT 0,
        order_cvr_paid DECIMAL(10,4) DEFAULT 0,
        conversion_placed DECIMAL(10,4) DEFAULT 0,
        conversion_paid DECIMAL(10,4) DEFAULT 0,
        sales_per_order_placed DECIMAL(14,2) DEFAULT 0,
        sales_per_order_paid DECIMAL(14,2) DEFAULT 0,
        impressions NUMERIC DEFAULT 0,
        clicks NUMERIC DEFAULT 0,
        ctr DECIMAL(10,4) DEFAULT 0,
        unique_impressions NUMERIC DEFAULT 0,
        unique_clicks NUMERIC DEFAULT 0,
        visitors NUMERIC DEFAULT 0,
        page_views NUMERIC DEFAULT 0,
        bounce_visitors NUMERIC DEFAULT 0,
        bounce_rate DECIMAL(10,4) DEFAULT 0,
        search_clicks NUMERIC DEFAULT 0,
        likes NUMERIC DEFAULT 0,
        cart_visitors NUMERIC DEFAULT 0,
        cart_quantity NUMERIC DEFAULT 0,
        cart_conversion_rate DECIMAL(10,4) DEFAULT 0,
        report_period VARCHAR(64) DEFAULT '',
        extra_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_ppr_company_sku_date ON product_performance_reports(company_id, sku_code, report_date);
      CREATE INDEX idx_ppr_company_store ON product_performance_reports(company_id, store_name);
      CREATE INDEX idx_ppr_company_variation ON product_performance_reports(company_id, variation_sku);
    `);

    // ===== Store Promoter Mappings =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_promoter_mappings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        store_name VARCHAR(128) NOT NULL,
        store_id VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        promoter_name VARCHAR(64) DEFAULT '',
        is_primary BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX uq_store_promoter ON store_promoter_mappings(company_id, store_name, user_id);
      CREATE INDEX idx_spm_company_store ON store_promoter_mappings(company_id, store_name);
      CREATE INDEX idx_spm_company_user ON store_promoter_mappings(company_id, user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS store_promoter_mappings');
    await queryRunner.query('DROP TABLE IF EXISTS product_performance_reports');
    await queryRunner.query('DROP TABLE IF EXISTS promotion_fee_reports');
    await queryRunner.query('DROP TABLE IF EXISTS inventory_reports');
    await queryRunner.query('DROP TABLE IF EXISTS sku_sales_reports');
  }
}
