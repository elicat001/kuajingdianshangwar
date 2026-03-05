import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('inventory_facts')
export class InventoryFactEntity extends BaseEntity {
  @Column({ name: 'sku_id' })
  skuId: string;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ type: 'date', name: 'report_date' })
  reportDate: Date;

  @Column({ name: 'fulfillable_qty', default: 0 })
  fulfillableQty: number;

  @Column({ name: 'inbound_qty', default: 0 })
  inboundQty: number;

  @Column({ name: 'reserved_qty', default: 0 })
  reservedQty: number;

  @Column({ name: 'unfulfillable_qty', default: 0 })
  unfulfillableQty: number;

  @Column({ name: 'days_of_supply', nullable: true })
  daysOfSupply: number;

  @Column({ name: 'is_stockout', default: false })
  isStockout: boolean;
}
