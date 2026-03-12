import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('sku_sales_reports')
@Index('idx_ssr_company_sku', ['companyId', 'skuCode'])
@Index('idx_ssr_company_store_date', ['companyId', 'storeName', 'reportDate'])
@Index('idx_ssr_company_period', ['companyId', 'reportPeriod'])
export class SkuSalesReportEntity extends BaseEntity {
  @Column({ name: 'sku_code', length: 128 })
  skuCode: string;

  @Column({ name: 'product_name', length: 255, default: '' })
  productName: string;

  @Column({ name: 'store_name', length: 128, default: '' })
  storeName: string;

  @Column({ length: 64, default: '' })
  platform: string;

  @Column({ name: 'raw_shop', length: 256, default: '' })
  rawShop: string;

  @Column({ name: 'variant_id', length: 128, default: '' })
  variantId: string;

  @Column({ default: 0 })
  quantity: number;

  @Column({
    name: 'sales_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  salesAmount: number;

  @Column({
    name: 'avg_price',
    type: 'decimal',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  avgPrice: number;

  @Column({ name: 'report_period', length: 64, default: '' })
  reportPeriod: string;

  @Column({ name: 'report_date', type: 'date', nullable: true })
  reportDate: Date;

  @Column({ name: 'extra_data', type: 'jsonb', default: '{}' })
  extraData: Record<string, any>;
}
