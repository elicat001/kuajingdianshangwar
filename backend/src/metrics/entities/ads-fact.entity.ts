import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('ads_facts')
export class AdsFactEntity extends BaseEntity {
  @Column({ name: 'sku_id' })
  skuId: string;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ type: 'date', name: 'report_date' })
  reportDate: Date;

  @Column({ default: 0 })
  impressions: number;

  @Column({ default: 0 })
  clicks: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'ad_spend',
    default: 0,
  })
  adSpend: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'ad_revenue',
    default: 0,
  })
  adRevenue: number;

  @Column({ name: 'ad_orders', default: 0 })
  adOrders: number;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 4,
    default: 0,
  })
  acos: number;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 4,
    default: 0,
  })
  roas: number;
}
