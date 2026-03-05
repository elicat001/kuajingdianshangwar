import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('sales_facts')
export class SalesFactEntity extends BaseEntity {
  @Column({ name: 'sku_id' })
  skuId: string;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ type: 'date', name: 'report_date' })
  reportDate: Date;

  @Column({ name: 'units_ordered', default: 0 })
  unitsOrdered: number;

  @Column({ name: 'units_shipped', default: 0 })
  unitsShipped: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'ordered_revenue',
    default: 0,
  })
  orderedRevenue: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'shipped_revenue',
    default: 0,
  })
  shippedRevenue: number;

  @Column({ default: 0 })
  sessions: number;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 4,
    name: 'conversion_rate',
    default: 0,
  })
  conversionRate: number;
}
