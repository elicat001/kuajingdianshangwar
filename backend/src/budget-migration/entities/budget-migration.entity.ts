import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('budget_migrations')
export class BudgetMigrationEntity extends BaseEntity {
  @Column({ name: 'source_campaign_id' })
  sourceCampaignId: string;

  @Column({ name: 'target_campaign_id' })
  targetCampaignId: string;

  @Column({ name: 'source_sku_id', nullable: true })
  sourceSkuId: string;

  @Column({ name: 'target_sku_id', nullable: true })
  targetSkuId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'migrated_amount' })
  migratedAmount: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'source_roas' })
  sourceRoas: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'target_roas' })
  targetRoas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'source_daily_budget' })
  sourceDailyBudget: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'target_daily_budget' })
  targetDailyBudget: number;

  @Column({ default: 'PENDING' })
  status: string; // PENDING, APPROVED, EXECUTED, ROLLED_BACK

  @Column({ name: 'action_id', nullable: true })
  actionId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'expected_impact' })
  expectedImpact: Record<string, any>;
}
