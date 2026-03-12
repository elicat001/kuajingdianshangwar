import { Injectable } from '@nestjs/common';
import { BaseImporter } from './base-importer';

/**
 * Importer for Inventory Report Excel files.
 * Ported from Ke/backend/api/import_inventory_excel.py
 */
@Injectable()
export class InventoryReportImporter extends BaseImporter {
  readonly dataType = 'inventory_report';

  readonly headerMap: Record<string, string[]> = {
    skuCode: ['SKU', 'sku', 'SKU编码'],
    title: ['标题', '产品名称', '产品名'],
    warehouse: ['仓库'],
    shelfLocation: ['货架位'],
    lowStock: ['低库存'],
    purchaseInTransit: ['采购在途'],
    transferInTransit: ['调拨在途'],
    occupiedQty: ['占用数'],
    availableStock: ['可用库存'],
    currentStock: ['现有库存'],
    avgCost: ['平均成本'],
    subtotal: ['小计'],
  };

  parseRows(
    rows: Record<string, any>[],
    companyId: string,
    meta: { storeId?: string; siteId?: string; reportDate?: string; filename?: string },
  ): { reportEntities: any[]; factEntities: any[] } {
    const reportPeriod = meta.reportDate || this.extractDateFromFilename(meta.filename || '') || '';
    const reportEntities: any[] = [];
    const factEntities: any[] = [];

    // Parse date for reportDate column
    let reportDate: Date | null = null;
    if (reportPeriod) {
      const dateStr = reportPeriod.includes('~') ? reportPeriod.split('~')[0] : reportPeriod;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) reportDate = d;
    }

    for (const row of rows) {
      let skuCode = this.resolveString(row, 'skuCode', 128);
      const title = this.resolveString(row, 'title');
      const warehouse = this.resolveString(row, 'warehouse', 128);
      const shelfLocation = this.resolveString(row, 'shelfLocation', 128);
      const lowStock = this.resolveNumber(row, 'lowStock');
      const purchaseInTransit = this.resolveNumber(row, 'purchaseInTransit');
      const transferInTransit = this.resolveNumber(row, 'transferInTransit');
      const occupiedQty = this.resolveNumber(row, 'occupiedQty');
      const availableStock = this.resolveNumber(row, 'availableStock');
      const currentStock = this.resolveNumber(row, 'currentStock');
      const avgCost = this.resolveDecimal(row, 'avgCost');
      const subtotal = this.resolveDecimal(row, 'subtotal') ?? 0;

      // Skip rows without identifying info
      if (!skuCode && !title) continue;
      if (!skuCode) skuCode = title || '-';

      const extraData = this.buildRowExtraData(row);

      reportEntities.push({
        companyId,
        skuCode,
        title,
        warehouse,
        shelfLocation,
        lowStock,
        purchaseInTransit,
        transferInTransit,
        occupiedQty,
        availableStock,
        currentStock,
        avgCost,
        subtotal,
        reportPeriod,
        reportDate,
        extraData,
      });

      // Backward-compat InventoryFact
      factEntities.push({
        companyId,
        skuId: skuCode,
        storeId: meta.storeId || warehouse,
        siteId: meta.siteId || '',
        reportDate: reportDate || new Date(),
        fulfillableQty: availableStock,
        inboundQty: purchaseInTransit,
        reservedQty: occupiedQty,
        unfulfillableQty: 0,
        daysOfSupply: null,
        isStockout: availableStock <= 0,
      });
    }

    return { reportEntities, factEntities };
  }
}
