import { Entity, Column, OneToMany, VersionColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ActionType, ActionStatus } from '../../common/enums';
import { ApprovalEntity } from './approval.entity';
import { ExecutionEntity } from './execution.entity';
import { RollbackEntity } from './rollback.entity';

@Entity('actions')
export class ActionEntity extends BaseEntity {
  @VersionColumn()
  version: number;
  @Column({ name: 'recommendation_id', nullable: true })
  recommendationId: string;

  @Column({ type: 'enum', enum: ActionType })
  type: ActionType;

  @Column({ type: 'enum', enum: ActionStatus, default: ActionStatus.DRAFT })
  status: ActionStatus;

  @Column({ type: 'jsonb', nullable: true })
  params: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  guardrails: Record<string, any>;

  @Column({ name: 'risk_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  riskScore: number;

  @Column({ name: 'requires_approval', default: true })
  requiresApproval: boolean;

  @Column({ name: 'sku_id', nullable: true })
  skuId: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ name: 'site_id', nullable: true })
  siteId: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt: Date;

  @Column({ name: 'verification_result', type: 'jsonb', nullable: true })
  verificationResult: Record<string, any>;

  @OneToMany(() => ApprovalEntity, (a) => a.action)
  approvals: ApprovalEntity[];

  @OneToMany(() => ExecutionEntity, (e) => e.action)
  executions: ExecutionEntity[];

  @OneToMany(() => RollbackEntity, (r) => r.action)
  rollbacks: RollbackEntity[];
}
