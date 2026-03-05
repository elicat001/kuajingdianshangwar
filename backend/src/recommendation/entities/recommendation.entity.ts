import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { RiskLevel, RecommendationStatus } from '../../common/enums';
import { AlertEntity } from '../../alert/entities/alert.entity';

@Entity('recommendations')
export class RecommendationEntity extends BaseEntity {
  @Column({ name: 'alert_id', nullable: true })
  alertId: string;

  @Column({ name: 'sku_id', nullable: true })
  skuId: string;

  @Column({ type: 'text' })
  rationale: string;

  @Column({ name: 'evidence_json', type: 'jsonb', nullable: true })
  evidenceJson: Record<string, any>;

  @Column({
    name: 'expected_gain',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  expectedGain: number;

  @Column({ name: 'risk_level', type: 'enum', enum: RiskLevel })
  riskLevel: RiskLevel;

  @Column({ name: 'suggested_actions', type: 'jsonb', nullable: true })
  suggestedActions: Record<string, any>[];

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.PENDING,
  })
  status: RecommendationStatus;

  @ManyToOne(() => AlertEntity)
  @JoinColumn({ name: 'alert_id' })
  alert: AlertEntity;
}
