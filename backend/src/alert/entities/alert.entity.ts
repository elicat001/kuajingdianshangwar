import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AlertType, Severity, AlertStatus } from '../../common/enums';

@Entity('alerts')
export class AlertEntity extends BaseEntity {
  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ type: 'enum', enum: Severity })
  severity: Severity;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.OPEN })
  status: AlertStatus;

  @Column({ name: 'sku_id', nullable: true })
  skuId: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ name: 'site_id', nullable: true })
  siteId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'evidence_json', type: 'jsonb', nullable: true })
  evidenceJson: Record<string, any>;

  @Index({ unique: true })
  @Column({ name: 'dedupe_key', unique: true })
  dedupeKey: string;

  @Column({ name: 'window_start', type: 'timestamptz', nullable: true })
  windowStart: Date;

  @Column({ name: 'window_end', type: 'timestamptz', nullable: true })
  windowEnd: Date;

  @Column({ name: 'metric_version_id', nullable: true })
  metricVersionId: string;
}
