import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBudgetMigrations1710000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS budget_migrations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        source_campaign_id VARCHAR(255) NOT NULL,
        target_campaign_id VARCHAR(255) NOT NULL,
        source_sku_id UUID,
        target_sku_id UUID,
        migrated_amount DECIMAL(12,2) NOT NULL,
        source_roas DECIMAL(8,2) NOT NULL DEFAULT 0,
        target_roas DECIMAL(8,2) NOT NULL DEFAULT 0,
        source_daily_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
        target_daily_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        action_id UUID,
        expected_impact JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_budget_migrations_company ON budget_migrations(company_id);
      CREATE INDEX idx_budget_migrations_status ON budget_migrations(company_id, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS budget_migrations');
  }
}
