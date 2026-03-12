import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTool, ToolResult } from './base-tool';
import { InventoryReportEntity } from '../../metrics/entities/inventory-report.entity';
import { InventoryFactEntity } from '../../metrics/entities/inventory-fact.entity';

@Injectable()
export class InventoryTool extends AgentTool {
  name = 'inventory';

  constructor(
    @InjectRepository(InventoryReportEntity)
    private readonly invRepo: Repository<InventoryReportEntity>,
    @InjectRepository(InventoryFactEntity)
    private readonly invFactRepo: Repository<InventoryFactEntity>,
  ) {
    super();
  }

  async execute(companyId: string, keyword: string): Promise<ToolResult> {
    if (!keyword) {
      return { data: null, summary: '请说明要查哪个 SKU 的库存。' };
    }

    try {
      // Primary: InventoryReportEntity
      const result = await this.queryReportEntity(companyId, keyword);
      if (result) return result;

      // Fallback: InventoryFactEntity
      const fallback = await this.queryFactEntity(companyId, keyword);
      if (fallback) return fallback;

      return { data: null, summary: `未找到与「${keyword}」相关的库存数据。` };
    } catch (error) {
      return { data: null, summary: `库存查询出错：${error.message || error}` };
    }
  }

  private async queryReportEntity(
    companyId: string,
    keyword: string,
  ): Promise<ToolResult | null> {
    // Get distinct report periods/dates for the keyword
    const periods = await this.invRepo
      .createQueryBuilder('i')
      .select('DISTINCT i.reportPeriod', 'reportPeriod')
      .addSelect('i.reportDate', 'reportDate')
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.skuCode ILIKE :kw', { kw: `%${keyword}%` })
      .getRawMany();

    if (periods.length === 0) return null;

    // Find closest period to today
    const today = new Date();
    let bestPeriod: string | null = null;
    let bestDate: Date | null = null;
    let bestDelta = Infinity;

    for (const p of periods) {
      const d = this.parseDate(p.reportDate || p.reportPeriod);
      if (d) {
        const delta = Math.abs(d.getTime() - today.getTime());
        if (delta < bestDelta) {
          bestDelta = delta;
          bestPeriod = p.reportPeriod || null;
          bestDate = p.reportDate || null;
        }
      }
    }

    // Build query for the best period
    let qb = this.invRepo
      .createQueryBuilder('i')
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.skuCode ILIKE :kw', { kw: `%${keyword}%` });

    if (bestPeriod) {
      qb = qb.andWhere('i.reportPeriod = :period', { period: bestPeriod });
    } else if (bestDate) {
      qb = qb.andWhere('i.reportDate = :date', { date: bestDate });
    }

    const rows = await qb.getMany();
    if (rows.length === 0) return null;

    // Aggregate by SKU
    const bySku: Record<string, number> = {};
    for (const r of rows) {
      bySku[r.skuCode] = (bySku[r.skuCode] || 0) + (r.availableStock || 0);
    }
    const total = Object.values(bySku).reduce((a, b) => a + b, 0);

    const periodLabel = bestPeriod || (bestDate ? new Date(bestDate).toISOString().slice(0, 10) : '');
    const lines = [
      `**库存汇总（${keyword}，报告期 ${periodLabel}）**`,
      `- 可用库存合计：${total}`,
    ];
    const sorted = Object.entries(bySku)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    for (const [sku, qty] of sorted) {
      lines.push(`- ${sku}：${qty}`);
    }

    return {
      data: { total, by_sku: bySku },
      summary: lines.join('\n'),
    };
  }

  private async queryFactEntity(
    companyId: string,
    keyword: string,
  ): Promise<ToolResult | null> {
    const rows = await this.invFactRepo
      .createQueryBuilder('i')
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.skuId ILIKE :kw', { kw: `%${keyword}%` })
      .orderBy('i.reportDate', 'DESC')
      .limit(15)
      .getMany();

    if (rows.length === 0) return null;

    const total = rows.reduce((sum, r) => sum + (r.fulfillableQty || 0), 0);
    const lines = [
      `**库存汇总（${keyword}）**`,
      `- 可用库存合计：${total}`,
    ];
    for (const r of rows) {
      lines.push(
        `- ${r.skuId}：${r.fulfillableQty}（可售 ${r.daysOfSupply ?? '-'} 天）`,
      );
    }

    return {
      data: { total, rows: rows.length },
      summary: lines.join('\n'),
    };
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const s = String(value);
    const m = s.match(/(\d{4})[/\-]?(\d{1,2})[/\-]?(\d{1,2})/);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }
}
