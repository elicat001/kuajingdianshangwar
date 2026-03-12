import { Injectable } from '@nestjs/common';
import { BaseImporter } from './base-importer';

/**
 * Importer for Promotion Fee / Ads Report Excel files.
 * Ported from Ke/backend/api/import_promotion_fee_excel.py
 *
 * Handles ad reports where the header row may not be row 1 (scans first 20 rows).
 */
@Injectable()
export class PromotionFeeImporter extends BaseImporter {
  readonly dataType = 'promotion_fee';

  /** Markers to detect which row is the real header row */
  static readonly HEADER_ROW_MARKERS = [
    '排序', '广告名称', '状态', '广告类型', '商品编号', '创作', '竞价方式', '版位',
    '开始日期', '结束日期', '展示次数', '点击数', '点击率', '转化', '直接转化', '转化率', '直接转化率',
    '每转化成本', '每一直接转化的成本', '商品已出售', '直接已售商品', '销售金额', '直接销售金额',
    '花费', '广告支出回报率', '直接广告支出回报率', '广告销售成本', '直接广告销售成本',
    '商品展示次数', '商品点击数', '商品点击率',
  ];

  readonly headerMap: Record<string, string[]> = {
    reportDate: ['日期', '报告日期', '开始日期'],
    endDate: ['结束日期'],
    storeName: ['店铺'],
    platform: ['平台'],
    skuCode: ['SKU', 'SKU编码', '商品编号'],
    campaignName: ['产品', '产品名称', '广告名称'],
    promotionFee: ['推广费', '广告花费', '花费'],
    clicks: ['点击', '点击量', '点击数'],
    productClicks: ['商品点击数'],
    productCtr: ['商品点击率'],
    ctr: ['点击率'],
    orders: ['订单', '订单数', '转化'],
    directConversion: ['直接转化'],
    conversionRate: ['转化率'],
    directConversionRate: ['直接转化率'],
    impressions: ['展示次数'],
    productImpressions: ['商品展示次数'],
    rankOrder: ['排序'],
    status: ['状态'],
    adType: ['广告类型'],
    creation: ['创作'],
    bidType: ['竞价方式'],
    placement: ['版位'],
    costPerConversion: ['每转化成本'],
    costPerDirectConversion: ['每一直接转化的成本'],
    quantitySold: ['商品已出售'],
    directQuantitySold: ['直接已售商品'],
    salesAmount: ['销售金额'],
    directSalesAmount: ['直接销售金额'],
    roas: ['广告支出回报率'],
    directRoas: ['直接广告支出回报率'],
    adSalesCost: ['广告销售成本'],
    directAdSalesCost: ['直接广告销售成本'],
  };

  parseRows(
    rows: Record<string, any>[],
    companyId: string,
    meta: { storeId?: string; siteId?: string; reportDate?: string; filename?: string },
  ): { reportEntities: any[]; factEntities: any[] } {
    const reportPeriod = meta.reportDate || this.extractDateFromFilename(meta.filename || '') || '';
    const reportEntities: any[] = [];
    const factEntities: any[] = [];

    for (const row of rows) {
      const skuCode = this.resolveString(row, 'skuCode', 128);
      const campaignName = this.resolveString(row, 'campaignName');
      const reportDate = meta.reportDate || this.resolveString(row, 'reportDate', 32);
      const endDate = this.resolveString(row, 'endDate', 32);
      const store = meta.storeId || this.resolveString(row, 'storeName', 128);
      const platform = meta.siteId || this.resolveString(row, 'platform', 64);

      const promotionFee = this.resolveDecimal(row, 'promotionFee') ?? 0;
      const clicks = this.resolveNumber(row, 'clicks');
      const orders = this.resolveNumber(row, 'orders');
      const impressions = this.resolveNumber(row, 'impressions');
      const ctr = this.resolveRate(row, 'ctr');
      const directConversion = this.resolveNumber(row, 'directConversion');
      const conversionRate = this.resolveRate(row, 'conversionRate');
      const directConversionRate = this.resolveRate(row, 'directConversionRate');
      const costPerConversion = this.resolveDecimal(row, 'costPerConversion');
      const costPerDirectConversion = this.resolveDecimal(row, 'costPerDirectConversion');
      const quantitySold = this.resolveNumber(row, 'quantitySold');
      const directQuantitySold = this.resolveNumber(row, 'directQuantitySold');
      const salesAmount = this.resolveDecimal(row, 'salesAmount') ?? 0;
      const directSalesAmount = this.resolveDecimal(row, 'directSalesAmount') ?? 0;
      const roas = this.resolveRate(row, 'roas') ?? this.resolveDecimal(row, 'roas');
      const directRoas = this.resolveRate(row, 'directRoas') ?? this.resolveDecimal(row, 'directRoas');
      const adSalesCost = this.resolveDecimal(row, 'adSalesCost');
      const directAdSalesCost = this.resolveDecimal(row, 'directAdSalesCost');
      const productImpressions = this.resolveNumber(row, 'productImpressions');
      const productClicks = this.resolveNumber(row, 'productClicks');
      const productCtr = this.resolveRate(row, 'productCtr');
      const rankOrder = this.resolveString(row, 'rankOrder', 32);
      const status = this.resolveString(row, 'status', 64);
      const adType = this.resolveString(row, 'adType', 64);
      const creation = this.resolveString(row, 'creation', 128);
      const bidType = this.resolveString(row, 'bidType', 64);
      const placement = this.resolveString(row, 'placement', 128);

      // Skip "re-check" marker rows
      if (skuCode.includes('重新检查')) continue;

      const extraData = this.buildRowExtraData(row);

      reportEntities.push({
        companyId,
        reportDate,
        storeName: store,
        platform,
        skuCode,
        campaignName,
        rankOrder,
        status,
        adType,
        creation,
        bidType,
        placement,
        endDate,
        promotionFee,
        impressions,
        clicks,
        ctr,
        orders,
        directConversion,
        conversionRate,
        directConversionRate,
        costPerConversion,
        costPerDirectConversion,
        quantitySold,
        directQuantitySold,
        salesAmount,
        directSalesAmount,
        roas,
        directRoas,
        adSalesCost,
        directAdSalesCost,
        productImpressions,
        productClicks,
        productCtr,
        reportPeriod,
        extraData,
      });

      // Backward-compat AdsFact
      let factReportDate: Date;
      if (reportDate) {
        const d = new Date(reportDate);
        factReportDate = isNaN(d.getTime()) ? new Date() : d;
      } else {
        factReportDate = new Date();
      }

      factEntities.push({
        companyId,
        skuId: skuCode,
        storeId: store,
        siteId: platform,
        reportDate: factReportDate,
        impressions,
        clicks,
        adSpend: promotionFee,
        adRevenue: salesAmount,
        adOrders: orders,
        acos: promotionFee && salesAmount ? promotionFee / salesAmount : 0,
        roas: roas ?? 0,
        ctr: ctr ?? 0,
        conversionRate: conversionRate ?? 0,
        costPerConversion: costPerConversion ?? 0,
        directSales: directSalesAmount,
        directOrders: directConversion,
      });
    }

    return { reportEntities, factEntities };
  }
}
