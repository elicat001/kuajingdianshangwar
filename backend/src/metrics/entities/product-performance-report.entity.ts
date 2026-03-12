import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('product_performance_reports')
@Index('idx_ppr_company_sku_date', ['companyId', 'skuCode', 'reportDate'])
@Index('idx_ppr_company_store', ['companyId', 'storeName'])
@Index('idx_ppr_company_variation', ['companyId', 'variationSku'])
export class ProductPerformanceReportEntity extends BaseEntity {
  @Column({ name: 'report_date', length: 32, default: '' })
  reportDate: string;

  @Column({ name: 'store_name', length: 128, default: '' })
  storeName: string;

  @Column({ length: 64, default: '' })
  platform: string;

  // Product identification
  @Column({ name: 'sku_code', length: 128, default: '' })
  skuCode: string;

  @Column({ name: 'product_name', length: 255, default: '' })
  productName: string;

  @Column({ name: 'item_status', length: 64, default: '' })
  itemStatus: string;

  // Variation details
  @Column({ name: 'variation_id', length: 128, default: '' })
  variationId: string;

  @Column({ name: 'variation_name', length: 255, default: '' })
  variationName: string;

  @Column({ name: 'variation_status', length: 64, default: '' })
  variationStatus: string;

  @Column({ name: 'variation_sku', length: 128, default: '' })
  variationSku: string;

  @Column({ name: 'global_sku', length: 128, default: '' })
  globalSku: string;

  // Sales amount (BRL)
  @Column({
    name: 'sales_amount_placed',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  salesAmountPlaced: number;

  @Column({
    name: 'sales_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  salesAmount: number;

  // Impressions and clicks
  @Column({ default: 0 })
  impressions: number;

  @Column({ default: 0 })
  clicks: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  ctr: number;

  // Orders and conversion
  @Column({
    name: 'order_cvr_placed',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  orderCvrPlaced: number;

  @Column({
    name: 'order_cvr_paid',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  orderCvrPaid: number;

  @Column({ name: 'orders_placed', default: 0 })
  ordersPlaced: number;

  @Column({ default: 0 })
  orders: number;

  @Column({ name: 'quantity_placed', default: 0 })
  quantityPlaced: number;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'buyers_placed', default: 0 })
  buyersPlaced: number;

  @Column({ name: 'buyers_paid', default: 0 })
  buyersPaid: number;

  @Column({
    name: 'conversion_placed',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  conversionPlaced: number;

  @Column({
    name: 'conversion_paid',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  conversionPaid: number;

  @Column({
    name: 'sales_per_order_placed',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  salesPerOrderPlaced: number;

  @Column({
    name: 'sales_per_order_paid',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  salesPerOrderPaid: number;

  // Visitor and exposure metrics
  @Column({ name: 'unique_impressions', default: 0 })
  uniqueImpressions: number;

  @Column({ name: 'unique_clicks', default: 0 })
  uniqueClicks: number;

  @Column({ default: 0 })
  visitors: number;

  @Column({ name: 'page_views', default: 0 })
  pageViews: number;

  @Column({ name: 'bounce_visitors', default: 0 })
  bounceVisitors: number;

  @Column({
    name: 'bounce_rate',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  bounceRate: number;

  @Column({ name: 'search_clicks', default: 0 })
  searchClicks: number;

  @Column({ default: 0 })
  likes: number;

  // Cart metrics
  @Column({ name: 'cart_visitors', default: 0 })
  cartVisitors: number;

  @Column({ name: 'cart_quantity', default: 0 })
  cartQuantity: number;

  @Column({
    name: 'cart_conversion_rate',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  cartConversionRate: number;

  @Column({ name: 'report_period', length: 64, default: '' })
  reportPeriod: string;

  @Column({ name: 'extra_data', type: 'jsonb', default: '{}' })
  extraData: Record<string, any>;
}
