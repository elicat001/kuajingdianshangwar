import { Injectable } from '@nestjs/common';
import { BaseImporter } from './base-importer';

/**
 * Importer for Product Info (SKU Master) — supports both standard Excel
 * AND Feishu Bitable JSON format.
 * Ported from Ke/backend/api/import_product_excel.py
 */
@Injectable()
export class ProductInfoImporter extends BaseImporter {
  readonly dataType = 'product_info';

  /** Excel header map (CN -> entity field) */
  readonly headerMap: Record<string, string[]> = {
    sku: ['SKU', 'sku', 'SKU编码'],
    title: ['产品名称', '商品名', '产品名'],
    platform: ['平台'],
    imageUrl: ['图片'],
    purchasePrice: ['采购价/RMB', '采购价'],
    cost: ['成本'],
    shippingCost: ['头程均摊/PCS', '头程均摊', '运费/CBM', '运费'],
    boxLength: ['外箱长'],
    boxWidth: ['外箱宽'],
    boxHeight: ['外箱高'],
    packPerBox: ['装箱数/PSC', '装箱数/PCS', '装箱数'],
    weight: ['单件重量KG', '单件重量'],
    exchangeRate: ['汇率'],
    profitRate: ['利润率'],
    status: ['产品状态', '状态'],
    promoter: ['主推人'],
  };

  /**
   * JSON field map: supports both Chinese header names and English field names
   * (used for Feishu Bitable JSON format and flat JSON).
   */
  static readonly DATA_FIELD_MAP: Record<string, string> = {
    platform: 'platform', '平台': 'platform',
    code: 'sku', SKU: 'sku', sku: 'sku',
    name: 'title', '产品名称': 'title', '商品名': 'title',
    image: 'imageUrl', '图片': 'imageUrl',
    description: 'description', '描述': 'description',
    purchase_price_rmb: 'purchasePrice', '采购价/RMB': 'purchasePrice', '采购价': 'purchasePrice',
    cost: 'cost', '成本': 'cost',
    first_leg_per_pcs: 'shippingCost', '头程均摊/PCS': 'shippingCost', '头程均摊': 'shippingCost',
    box_length: 'boxLength', '外箱长': 'boxLength',
    box_width: 'boxWidth', '外箱宽': 'boxWidth',
    box_height: 'boxHeight', '外箱高': 'boxHeight',
    qty_per_carton: 'packPerBox', '装箱数/PCS': 'packPerBox', '装箱数': 'packPerBox',
    weight_kg: 'weight', '单件重量KG': 'weight', '单件重量': 'weight',
    shipping_per_cbm: 'shippingCost', '运费/CBM': 'shippingCost', '运费': 'shippingCost',
    profit_rate: 'profitRate', '利润率': 'profitRate',
    exchange_rate: 'exchangeRate', '汇率': 'exchangeRate',
    status: 'status', '产品状态': 'status', '状态': 'status',
    main_promoter: 'promoter', '主推人': 'promoter',
  };

  // ---------------------------------------------------------------------------
  // Feishu value normalization
  // ---------------------------------------------------------------------------

  /**
   * Normalize Feishu Bitable field values:
   * - [{"text":"xxx"}] => "xxx"
   * - {"type":2,"value":[n]} => n
   * - [{"name":"A"},{"name":"B"}] => "A,B" (multi-person)
   * - [{"url":"..."}] => first url (images)
   * - scalars pass through unchanged
   */
  normalizeFeishuValue(v: any): any {
    if (v === null || v === undefined) return null;
    if (Array.isArray(v) && v.length > 0) {
      const first = v[0];
      if (typeof first === 'object' && first !== null) {
        if ('text' in first) return first.text || '';
        if ('name' in first) {
          return v
            .filter((x: any) => typeof x === 'object' && x?.name)
            .map((x: any) => String(x.name).trim())
            .join(',');
        }
        if ('url' in first) return first.url || '';
      }
      return first;
    }
    if (typeof v === 'object' && v !== null && 'value' in v) {
      const val = v.value;
      if (Array.isArray(val) && val.length > 0) return val[0];
      return val;
    }
    return v;
  }

  // ---------------------------------------------------------------------------
  // Parse rows — Excel format (standard headerMap resolution)
  // ---------------------------------------------------------------------------

  parseRows(
    rows: Record<string, any>[],
    companyId: string,
    meta: { storeId?: string; siteId?: string; reportDate?: string; filename?: string },
  ): { skuEntities: any[] } {
    const skuEntities: any[] = [];

    for (const row of rows) {
      const sku = this.resolveString(row, 'sku', 64);
      if (!sku) continue;

      const title = this.resolveString(row, 'title') || sku;
      const platform = this.resolveString(row, 'platform', 64) || 'shopee';
      const imageUrl = this.resolveString(row, 'imageUrl', 512);
      const purchasePrice = this.resolveDecimal(row, 'purchasePrice');
      const cost = this.resolveDecimal(row, 'cost');
      const shippingCost = this.resolveDecimal(row, 'shippingCost');
      const boxLength = this.resolveDecimal(row, 'boxLength');
      const boxWidth = this.resolveDecimal(row, 'boxWidth');
      const boxHeight = this.resolveDecimal(row, 'boxHeight');
      const packPerBox = this.toInt(this.resolveField(row, 'packPerBox'));
      const weight = this.resolveDecimal(row, 'weight');
      const exchangeRate = this.resolveDecimal(row, 'exchangeRate');
      const profitRate = this.resolveDecimal(row, 'profitRate');
      const status = this.resolveString(row, 'status', 64);
      const promoter = this.resolveString(row, 'promoter', 255);

      // Build boxSize string from dimensions
      const boxSize =
        boxLength != null && boxWidth != null && boxHeight != null
          ? `${boxLength}x${boxWidth}x${boxHeight}`
          : null;

      skuEntities.push({
        companyId,
        sku,
        title,
        // We use storeId from meta, or leave empty for upsert logic in service
        storeId: meta.storeId || '',
        siteId: meta.siteId || '',
        imageUrl: imageUrl || null,
        purchasePrice: purchasePrice ?? null,
        cost: cost ?? null,
        shippingCost: shippingCost ?? null,
        weight: weight ?? null,
        boxSize,
        packPerBox: packPerBox ?? null,
        exchangeRate: exchangeRate ?? null,
        promoter: promoter || null,
        // Extra attributes stored as JSON
        attributes: {
          platform,
          profitRate,
          status,
        },
      });
    }

    return { skuEntities };
  }

  // ---------------------------------------------------------------------------
  // Parse JSON items — Feishu Bitable or flat JSON format
  // ---------------------------------------------------------------------------

  parseJsonItems(
    items: any[],
    companyId: string,
    meta: { storeId?: string; siteId?: string },
  ): { skuEntities: any[] } {
    const skuEntities: any[] = [];
    const fieldMap = ProductInfoImporter.DATA_FIELD_MAP;

    for (let raw of items) {
      if (!raw || typeof raw !== 'object') continue;

      // Feishu format: { fields: { ... }, record_id: "..." }
      if (raw.fields && typeof raw.fields === 'object') {
        const normalized: Record<string, any> = {};
        for (const [k, v] of Object.entries(raw.fields)) {
          normalized[k] = this.normalizeFeishuValue(v);
        }
        raw = normalized;
      }

      // Map keys to our field names
      const mapped: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) continue;
        const field = fieldMap[k] || fieldMap[String(k).trim()];
        if (field) mapped[field] = v;
      }

      const sku = this.toString(mapped.sku, 64);
      if (!sku) continue;

      const title = this.toString(mapped.title) || sku;
      const platform = this.toString(mapped.platform, 64) || 'shopee';

      const boxLength = this.toDecimal(mapped.boxLength);
      const boxWidth = this.toDecimal(mapped.boxWidth);
      const boxHeight = this.toDecimal(mapped.boxHeight);
      const boxSize =
        boxLength != null && boxWidth != null && boxHeight != null
          ? `${boxLength}x${boxWidth}x${boxHeight}`
          : null;

      skuEntities.push({
        companyId,
        sku,
        title,
        storeId: meta.storeId || '',
        siteId: meta.siteId || '',
        imageUrl: this.toString(mapped.imageUrl, 512) || null,
        purchasePrice: this.toDecimal(mapped.purchasePrice),
        cost: this.toDecimal(mapped.cost),
        shippingCost: this.toDecimal(mapped.shippingCost),
        weight: this.toDecimal(mapped.weight),
        boxSize,
        packPerBox: this.toInt(mapped.packPerBox),
        exchangeRate: this.toDecimal(mapped.exchangeRate),
        promoter: this.toString(mapped.promoter, 255) || null,
        attributes: {
          platform,
          profitRate: this.toDecimal(mapped.profitRate),
          status: this.toString(mapped.status, 64),
          description: this.toString(mapped.description),
        },
      });
    }

    return { skuEntities };
  }
}
