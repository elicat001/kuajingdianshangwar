/**
 * Base class for all Excel/data importers.
 * Provides shared utilities for header mapping, type conversion, and parsing.
 */
export abstract class BaseImporter {
  abstract readonly dataType: string;

  /**
   * Maps entity field name -> array of possible header names (CN/EN variants).
   * Example: { skuCode: ['SKU', 'sku', 'SKU编码', '商品编码'] }
   */
  abstract readonly headerMap: Record<string, string[]>;

  /**
   * Transform parsed rows into entity-ready objects.
   */
  abstract parseRows(
    rows: Record<string, any>[],
    companyId: string,
    meta: { storeId?: string; siteId?: string; reportDate?: string; filename?: string },
  ): any;

  // ---------------------------------------------------------------------------
  // Field resolution helpers
  // ---------------------------------------------------------------------------

  /**
   * Given a row (keyed by header name) and our field name, find the first
   * matching header value using headerMap.
   */
  resolveField(row: Record<string, any>, fieldName: string): any {
    const candidates = this.headerMap[fieldName];
    if (!candidates) return undefined;
    for (const header of candidates) {
      if (row[header] !== undefined && row[header] !== null) {
        return row[header];
      }
    }
    return undefined;
  }

  resolveString(row: Record<string, any>, fieldName: string, maxLen = 255): string {
    const v = this.resolveField(row, fieldName);
    return this.toString(v, maxLen);
  }

  resolveNumber(row: Record<string, any>, fieldName: string): number {
    const v = this.resolveField(row, fieldName);
    return this.toInt(v) ?? 0;
  }

  resolveDecimal(row: Record<string, any>, fieldName: string): number | null {
    const v = this.resolveField(row, fieldName);
    return this.toDecimal(v);
  }

  resolveRate(row: Record<string, any>, fieldName: string): number | null {
    const v = this.resolveField(row, fieldName);
    return this.parseRateValue(v);
  }

  // ---------------------------------------------------------------------------
  // Type conversion helpers (ported from Django)
  // ---------------------------------------------------------------------------

  toString(v: any, maxLen = 255): string {
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    return maxLen ? s.slice(0, maxLen) : s;
  }

  toInt(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    try {
      if (typeof v === 'number') {
        if (Number.isFinite(v)) return Math.trunc(v);
        return null;
      }
      const s = String(v).trim().replace(/,/g, '');
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      return Math.trunc(n);
    } catch {
      return null;
    }
  }

  /**
   * Normalize a decimal string that may use comma or dot as thousands/decimal
   * separator. Handles formats like "1,234.56", "1.234,56", "1234,56".
   */
  normalizeDecimalStr(s: string | null | undefined): string | null {
    if (s === null || s === undefined) return null;
    let str = String(s).trim();
    if (!str) return null;

    if (str.includes(',') && str.includes('.')) {
      // Both present: the one appearing last is the decimal separator
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        // "1.234,56" => comma is decimal
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // "1,234.56" => dot is decimal, remove commas
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      // Only comma: treat as decimal separator
      str = str.replace(',', '.');
    }
    // Remove any remaining commas
    str = str.replace(/,/g, '');

    // If multiple dots remain, join all-but-last as integer part
    if ((str.match(/\./g) || []).length > 1) {
      const parts = str.split('.');
      str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }

    return str || null;
  }

  toDecimal(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s = this.normalizeDecimalStr(String(v));
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Parse a rate/percentage value: strips "%" then parses as decimal.
   * "2,91%" => 2.91
   */
  parseRateValue(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const s = String(v).trim().replace('%', '').trim();
    return this.toDecimal(s);
  }

  // ---------------------------------------------------------------------------
  // Shopee shop[platform] parsing
  // ---------------------------------------------------------------------------

  parseShopPlatform(rawShop: string): { store: string; platform: string; raw: string } {
    const raw = this.toString(rawShop, 256);
    if (!raw) return { store: '', platform: '', raw: '' };
    const m = raw.match(/\[([^\]]+)\]/);
    if (m) {
      const platform = this.toString(m[1], 64);
      const store = this.toString(raw.slice(0, m.index), 128);
      return { store, platform, raw };
    }
    return { store: raw.slice(0, 128), platform: '', raw };
  }

  // ---------------------------------------------------------------------------
  // Date extraction from filename
  // ---------------------------------------------------------------------------

  extractDateFromFilename(filename: string): string | null {
    if (!filename) return null;
    const s = filename.replace(/\.(xlsx|xls)$/i, '').trim();

    // Match YYYY-MM-DD
    const m1 = s.match(/(20\d{2}-\d{2}-\d{2})/);
    if (m1) return m1[1];

    // Match YYYYMMDD
    const parts = s.match(/\b(20\d{6})\b/g);
    if (!parts || parts.length === 0) return null;
    if (parts.length === 1 && parts[0].length === 8) {
      const d = parts[0];
      return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    }
    if (parts.length >= 2 && parts[0].length === 8 && parts[1].length === 8) {
      const a = parts[0];
      const b = parts[1];
      return `${a.slice(0, 4)}-${a.slice(4, 6)}-${a.slice(6, 8)}~${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6, 8)}`;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Extra data collection
  // ---------------------------------------------------------------------------

  /**
   * Returns all columns from the row that are NOT in the mapped fields set,
   * suitable for storing as JSON extra_data.
   */
  collectExtraData(row: Record<string, any>, mappedHeaders: Set<string>): Record<string, any> {
    const extra: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!key || mappedHeaders.has(key)) continue;
      if (val === null || val === undefined) {
        extra[key] = '';
      } else if (typeof val === 'number') {
        extra[key] = val;
      } else {
        extra[key] = this.toString(val, 500);
      }
    }
    return extra;
  }

  /**
   * Build the set of all known header names from the headerMap
   * (used by collectExtraData to exclude mapped columns).
   */
  getAllMappedHeaders(): Set<string> {
    const s = new Set<string>();
    for (const headers of Object.values(this.headerMap)) {
      for (const h of headers) {
        s.add(h);
      }
    }
    return s;
  }

  /**
   * Build extra data from a row, keeping ALL columns (mapped or not)
   * as the Django code does — preserving everything for traceability.
   */
  buildRowExtraData(row: Record<string, any>): Record<string, any> {
    const extra: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!key) continue;
      if (val === null || val === undefined) {
        extra[key] = '';
      } else if (typeof val === 'number') {
        extra[key] = val;
      } else {
        extra[key] = this.toString(val, 500);
      }
    }
    return extra;
  }
}
