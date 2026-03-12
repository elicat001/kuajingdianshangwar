import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('inventory_reports')
@Index('idx_ir_company_sku', ['companyId', 'skuCode'])
@Index('idx_ir_company_warehouse', ['companyId', 'warehouse'])
@Index('idx_ir_company_date', ['companyId', 'reportDate'])
export class InventoryReportEntity extends BaseEntity {
  @Column({ name: 'sku_code', length: 128 })
  skuCode: string;

  @Column({ length: 255, default: '' })
  title: string;

  @Column({ length: 128, default: '' })
  warehouse: string;

  @Column({ name: 'shelf_location', length: 128, default: '' })
  shelfLocation: string;

  @Column({ name: 'low_stock', default: 0 })
  lowStock: number;

  @Column({ name: 'purchase_in_transit', default: 0 })
  purchaseInTransit: number;

  @Column({ name: 'transfer_in_transit', default: 0 })
  transferInTransit: number;

  @Column({ name: 'occupied_qty', default: 0 })
  occupiedQty: number;

  @Column({ name: 'available_stock', default: 0 })
  availableStock: number;

  @Column({ name: 'current_stock', default: 0 })
  currentStock: number;

  @Column({
    name: 'avg_cost',
    type: 'decimal',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  avgCost: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  subtotal: number;

  @Column({ name: 'report_period', length: 64, default: '' })
  reportPeriod: string;

  @Column({ name: 'report_date', type: 'date', nullable: true })
  reportDate: Date;

  @Column({ name: 'extra_data', type: 'jsonb', default: '{}' })
  extraData: Record<string, any>;
}
