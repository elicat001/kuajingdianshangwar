import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('config_thresholds')
@Index('idx_config_thresh_company', ['companyId'])
export class ConfigThresholdEntity extends BaseEntity {
  @Column({ name: 'metric_code' })
  metricCode: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ name: 'site_id', nullable: true })
  siteId: string;

  @Column({ name: 'sku_id', nullable: true })
  skuId: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, name: 'warn_value' })
  warnValue: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, name: 'critical_value' })
  criticalValue: number;

  @Column({ default: true })
  enabled: boolean;
}
