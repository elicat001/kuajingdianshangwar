import { Injectable } from '@nestjs/common';
import { BaseImporter } from './base-importer';

/**
 * Importer for SKU Sales Report Excel files.
 * Ported from Ke/backend/api/import_sku_sales_excel.py
 */
@Injectable()
export class SalesReportImporter extends BaseImporter {
  readonly dataType = 'sales_report';

  readonly headerMap: Record<string, string[]> = {
    skuCode: ['SKU', 'sku', 'SKU编码', '商品编码'],
    productName: ['产品名称', '产品名', '产品', '商品名称', '商品名'],
    shopRaw: ['店铺'],
    variantId: ['变种ID', '变种id', '变种'],
    quantity: ['有效订单量', '销量', '销售数量', '数量'],
    salesAmount: ['销售额', '销售金额', '金额'],
    avgPrice: ['平均售价', '均价'],
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
      let skuCode = this.resolveString(row, 'skuCode', 128);
      const productName = this.resolveString(row, 'productName');
      const quantity = this.resolveNumber(row, 'quantity');
      const salesAmount = this.resolveDecimal(row, 'salesAmount') ?? 0;
      const avgPrice = this.resolveDecimal(row, 'avgPrice');
      const variantId = this.resolveString(row, 'variantId', 128);

      // Parse shop[platform]
      const shopRawValue = this.resolveString(row, 'shopRaw', 256);
      const { store, platform, raw: rawShop } = this.parseShopPlatform(shopRawValue);

      // Apply overrides
      const finalStore = meta.storeId || store;
      const finalPlatform = meta.siteId || platform;

      // Skip rows without identifying info
      if (!skuCode && !productName) continue;
      if (!skuCode) skuCode = productName || '-';

      // Skip "re-check" marker rows
      if (skuCode.includes('重新检查')) continue;

      const extraData = this.buildRowExtraData(row);

      // Parse date for reportDate column
      let reportDate: Date | null = null;
      if (reportPeriod) {
        const dateStr = reportPeriod.includes('~') ? reportPeriod.split('~')[0] : reportPeriod;
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) reportDate = d;
      }

      reportEntities.push({
        companyId,
        skuCode,
        productName: productName || skuCode,
        storeName: finalStore,
        platform: finalPlatform,
        rawShop,
        variantId,
        quantity,
        salesAmount,
        avgPrice,
        reportPeriod,
        reportDate,
        extraData,
      });

      // Backward-compat SalesFact
      factEntities.push({
        companyId,
        skuId: skuCode,
        storeId: finalStore,
        siteId: finalPlatform,
        reportDate: reportDate || new Date(),
        unitsOrdered: quantity,
        unitsShipped: quantity,
        orderedRevenue: salesAmount,
        shippedRevenue: salesAmount,
        sessions: 0,
        conversionRate: 0,
      });
    }

    return { reportEntities, factEntities };
  }
}
