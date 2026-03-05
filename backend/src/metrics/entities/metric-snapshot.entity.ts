import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { MetricWindow } from '../../common/enums';

@Entity('metric_snapshots')
export class MetricSnapshotEntity extends BaseEntity {
  @Column({ name: 'metric_code' })
  metricCode: string;

  @Column({ name: 'sku_id', nullable: true })
  skuId: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ name: 'site_id', nullable: true })
  siteId: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  value: number;

  @Column({ type: 'enum', enum: MetricWindow })
  window: MetricWindow;

  @Column({ name: 'window_start', type: 'timestamptz' })
  windowStart: Date;

  @Column({ name: 'window_end', type: 'timestamptz' })
  windowEnd: Date;

  @Column({ name: 'metric_version_id', nullable: true })
  metricVersionId: string;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: Record<string, any>;
}
