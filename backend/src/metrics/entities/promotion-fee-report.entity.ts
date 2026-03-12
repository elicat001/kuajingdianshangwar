import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('promotion_fee_reports')
@Index('idx_pfr_company_sku_date', ['companyId', 'skuCode', 'reportDate'])
@Index('idx_pfr_company_store', ['companyId', 'storeName'])
@Index('idx_pfr_company_period', ['companyId', 'reportPeriod'])
export class PromotionFeeReportEntity extends BaseEntity {
  @Column({ name: 'report_date', length: 32, default: '' })
  reportDate: string;

  @Column({ name: 'store_name', length: 128, default: '' })
  storeName: string;

  @Column({ length: 64, default: '' })
  platform: string;

  @Column({ name: 'sku_code', length: 128, default: '' })
  skuCode: string;

  @Column({ name: 'campaign_name', length: 255, default: '' })
  campaignName: string;

  // Ad configuration
  @Column({ name: 'rank_order', length: 32, default: '' })
  rankOrder: string;

  @Column({ length: 64, default: '' })
  status: string;

  @Column({ name: 'ad_type', length: 64, default: '' })
  adType: string;

  @Column({ length: 128, default: '' })
  creation: string;

  @Column({ name: 'bid_type', length: 64, default: '' })
  bidType: string;

  @Column({ length: 128, default: '' })
  placement: string;

  @Column({ name: 'end_date', length: 32, default: '' })
  endDate: string;

  // Core metrics
  @Column({
    name: 'promotion_fee',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  promotionFee: number;

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

  @Column({ default: 0 })
  orders: number;

  @Column({ name: 'direct_conversion', default: 0 })
  directConversion: number;

  @Column({
    name: 'conversion_rate',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  conversionRate: number;

  @Column({
    name: 'direct_conversion_rate',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  directConversionRate: number;

  @Column({
    name: 'cost_per_conversion',
    type: 'decimal',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  costPerConversion: number;

  @Column({
    name: 'cost_per_direct_conversion',
    type: 'decimal',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  costPerDirectConversion: number;

  // Sales metrics
  @Column({ name: 'quantity_sold', default: 0 })
  quantitySold: number;

  @Column({ name: 'direct_quantity_sold', default: 0 })
  directQuantitySold: number;

  @Column({
    name: 'sales_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  salesAmount: number;

  @Column({
    name: 'direct_sales_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  directSalesAmount: number;

  // ROAS metrics
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  roas: number;

  @Column({
    name: 'direct_roas',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  directRoas: number;

  @Column({
    name: 'ad_sales_cost',
    type: 'decimal',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  adSalesCost: number;

  @Column({
    name: 'direct_ad_sales_cost',
    type: 'decimal',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  directAdSalesCost: number;

  // Product-level metrics
  @Column({ name: 'product_impressions', default: 0 })
  productImpressions: number;

  @Column({ name: 'product_clicks', default: 0 })
  productClicks: number;

  @Column({
    name: 'product_ctr',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  productCtr: number;

  @Column({ name: 'report_period', length: 64, default: '' })
  reportPeriod: string;

  @Column({ name: 'extra_data', type: 'jsonb', default: '{}' })
  extraData: Record<string, any>;
}
