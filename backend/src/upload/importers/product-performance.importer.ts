import { Injectable } from '@nestjs/common';
import { BaseImporter } from './base-importer';

/**
 * Importer for Product Performance Report Excel files.
 * Ported from Ke/backend/api/import_product_performance_excel.py
 */
@Injectable()
export class ProductPerformanceImporter extends BaseImporter {
  readonly dataType = 'product_performance';

  readonly headerMap: Record<string, string[]> = {
    reportDate: ['日期', '报告日期'],
    storeName: ['店铺'],
    platform: ['平台'],
    skuCode: ['商品编号', 'SKU', 'SKU编码'],
    productName: ['商品', '产品', '产品名称'],
    itemStatus: ['Current Item Status'],
    variationId: ['规格编号'],
    variationName: ['规格名称'],
    variationStatus: ['Current Variation Status'],
    variationSku: ['规格货号'],
    globalSku: ['全球商品货号'],
    salesAmountPlaced: [
      '销售额（已下订单） (BRL)', '销售额（已下订单）(BRL)', '销售额（已下订单）',
    ],
    salesAmount: [
      '销售额（已付款订单） (BRL)', '销售额（已付款订单）(BRL)', '销售额（已付款订单）',
    ],
    impressions: ['商品展示量', '曝光', '曝光量'],
    clicks: ['商品点击量', '点击', '点击量'],
    ctr: ['点击率'],
    orderCvrPlaced: ['订单转化率（已下订单）'],
    orderCvrPaid: ['订单转化率（已付款订单）'],
    ordersPlaced: ['已下订单'],
    orders: ['已付款订单', '订单', '订单数'],
    quantityPlaced: ['件数（已下订单）'],
    quantity: ['件数（已付款订单）', '销量', '销售数量'],
    buyersPlaced: ['买家数（已下订单）'],
    buyersPaid: ['买家数（已付款订单）'],
    conversionPlaced: ['转化率（已下订单）'],
    conversionPaid: ['转化率（已付款订单）'],
    salesPerOrderPlaced: [
      '每笔订单销售额（已下订单） (BRL)', '每笔订单销售额（已下订单）(BRL)',
    ],
    salesPerOrderPaid: [
      '每笔订单销售额（已付款订单） (BRL)', '每笔订单销售额（已付款订单）(BRL)',
    ],
    uniqueImpressions: ['不重复的商品曝光量'],
    uniqueClicks: ['不重复的商品点击量'],
    visitors: ['商品访客数量'],
    pageViews: ['商品页面访问量'],
    bounceVisitors: ['跳出商品页面的访客数'],
    bounceRate: ['商品跳出率'],
    searchClicks: ['搜索点击人数'],
    likes: ['赞'],
    cartVisitors: ['商品访客数 (加入购物车)', '商品访客数(加入购物车)'],
    cartQuantity: ['件数 (加入购物车）', '件数 (加入购物车)', '件数(加入购物车)'],
    cartConversionRate: ['转化率 (加入购物车率)'],
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
      const reportDate = meta.reportDate || this.resolveString(row, 'reportDate', 32);
      const store = meta.storeId || this.resolveString(row, 'storeName', 128);
      const platform = meta.siteId || this.resolveString(row, 'platform', 64);
      const skuCode = this.resolveString(row, 'skuCode', 128);
      const productName = this.resolveString(row, 'productName');
      const itemStatus = this.resolveString(row, 'itemStatus', 64);
      const variationId = this.resolveString(row, 'variationId', 128);
      const variationName = this.resolveString(row, 'variationName');
      const variationStatus = this.resolveString(row, 'variationStatus', 64);
      const variationSku = this.resolveString(row, 'variationSku', 128);
      const globalSku = this.resolveString(row, 'globalSku', 128);

      const salesAmountPlaced = this.resolveDecimal(row, 'salesAmountPlaced') ?? 0;
      const salesAmount = this.resolveDecimal(row, 'salesAmount') ?? 0;
      const impressions = this.resolveNumber(row, 'impressions');
      const clicks = this.resolveNumber(row, 'clicks');
      const ctr = this.resolveRate(row, 'ctr');
      const orderCvrPlaced = this.resolveRate(row, 'orderCvrPlaced');
      const orderCvrPaid = this.resolveRate(row, 'orderCvrPaid');
      const ordersPlaced = this.resolveNumber(row, 'ordersPlaced');
      const orders = this.resolveNumber(row, 'orders');
      const quantityPlaced = this.resolveNumber(row, 'quantityPlaced');
      const quantity = this.resolveNumber(row, 'quantity');
      const buyersPlaced = this.resolveNumber(row, 'buyersPlaced');
      const buyersPaid = this.resolveNumber(row, 'buyersPaid');
      const conversionPlaced = this.resolveDecimal(row, 'conversionPlaced');
      const conversionPaid = this.resolveDecimal(row, 'conversionPaid');
      const salesPerOrderPlaced = this.resolveDecimal(row, 'salesPerOrderPlaced');
      const salesPerOrderPaid = this.resolveDecimal(row, 'salesPerOrderPaid');
      const uniqueImpressions = this.resolveNumber(row, 'uniqueImpressions');
      const uniqueClicks = this.resolveNumber(row, 'uniqueClicks');
      const visitors = this.resolveNumber(row, 'visitors');
      const pageViews = this.resolveNumber(row, 'pageViews');
      const bounceVisitors = this.resolveNumber(row, 'bounceVisitors');
      const bounceRate = this.resolveRate(row, 'bounceRate');
      const searchClicks = this.resolveNumber(row, 'searchClicks');
      const likes = this.resolveNumber(row, 'likes');
      const cartVisitors = this.resolveNumber(row, 'cartVisitors');
      const cartQuantity = this.resolveNumber(row, 'cartQuantity');
      const cartConversionRate = this.resolveRate(row, 'cartConversionRate');

      // Skip "re-check" marker rows
      if (skuCode.includes('重新检查')) continue;

      const extraData = this.buildRowExtraData(row);

      reportEntities.push({
        companyId,
        reportDate,
        storeName: store,
        platform,
        skuCode,
        productName,
        itemStatus,
        variationId,
        variationName,
        variationStatus,
        variationSku,
        globalSku,
        salesAmountPlaced,
        salesAmount,
        impressions,
        clicks,
        ctr,
        orderCvrPlaced,
        orderCvrPaid,
        ordersPlaced,
        orders,
        quantityPlaced,
        quantity,
        buyersPlaced,
        buyersPaid,
        conversionPlaced,
        conversionPaid,
        salesPerOrderPlaced,
        salesPerOrderPaid,
        uniqueImpressions,
        uniqueClicks,
        visitors,
        pageViews,
        bounceVisitors,
        bounceRate,
        searchClicks,
        likes,
        cartVisitors,
        cartQuantity,
        cartConversionRate,
        reportPeriod,
        extraData,
      });

      // Backward-compat ProductPerformance fact
      let factReportDate: Date;
      if (reportDate) {
        const d = new Date(reportDate);
        factReportDate = isNaN(d.getTime()) ? new Date() : d;
      } else {
        factReportDate = new Date();
      }

      factEntities.push({
        companyId,
        skuId: skuCode || variationSku,
        storeId: store,
        siteId: platform,
        reportDate: factReportDate,
        pageViews,
        sessions: visitors,
        buyBoxPct: 0,
        unitsOrdered: quantity || orders,
        unitsRefunded: 0,
        refundRate: 0,
        rating: 0,
        reviewCount: likes,
        conversionRate: conversionPaid ?? 0,
      });
    }

    return { reportEntities, factEntities };
  }
}
