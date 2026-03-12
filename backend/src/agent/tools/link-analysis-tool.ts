import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTool, ToolResult } from './base-tool';
import { ProductPerformanceReportEntity } from '../../metrics/entities/product-performance-report.entity';

@Injectable()
export class LinkAnalysisTool extends AgentTool {
  name = 'link_analysis';

  constructor(
    @InjectRepository(ProductPerformanceReportEntity)
    private readonly pprRepo: Repository<ProductPerformanceReportEntity>,
  ) {
    super();
  }

  async execute(companyId: string, keyword: string): Promise<ToolResult> {
    if (!keyword) {
      return { data: null, summary: '请说明要查哪个 SKU 或品名的分析。' };
    }

    try {
      // Try today first, then yesterday
      let rows = await this.queryByDate(companyId, keyword, new Date());

      if (rows.length === 0) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        rows = await this.queryByDate(companyId, keyword, yesterday);
      }

      // If still no date-specific results, query without date filter (latest)
      if (rows.length === 0) {
        rows = await this.pprRepo
          .createQueryBuilder('p')
          .where('p.companyId = :companyId', { companyId })
          .andWhere(
            '(p.skuCode ILIKE :kw OR p.variationSku ILIKE :kw OR p.productName ILIKE :kw)',
            { kw: `%${keyword}%` },
          )
          .orderBy('p.reportDate', 'DESC')
          .limit(10)
          .getMany();
      }

      if (rows.length === 0) {
        return { data: null, summary: `未找到与「${keyword}」相关的 SKU 分析数据。` };
      }

      return this.buildResult(keyword, rows);
    } catch (error) {
      return { data: null, summary: `SKU 分析查询出错：${error.message || error}` };
    }
  }

  private async queryByDate(
    companyId: string,
    keyword: string,
    date: Date,
  ): Promise<ProductPerformanceReportEntity[]> {
    const dateStr = date.toISOString().slice(0, 10);
    // Also try d/m/y format used in some stores
    const altDateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

    return this.pprRepo
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId })
      .andWhere(
        '(p.skuCode ILIKE :kw OR p.variationSku ILIKE :kw OR p.productName ILIKE :kw)',
        { kw: `%${keyword}%` },
      )
      .andWhere('(p.reportDate = :d1 OR p.reportDate = :d2)', {
        d1: dateStr,
        d2: altDateStr,
      })
      .orderBy('p.salesAmount', 'DESC')
      .limit(10)
      .getMany();
  }

  private buildResult(
    keyword: string,
    rows: ProductPerformanceReportEntity[],
  ): ToolResult {
    const resultRows = rows.map((r) => ({
      store: r.storeName,
      skuCode: r.skuCode,
      name: r.productName,
      variationSku: r.variationSku,
      salesAmount: Number(r.salesAmount || 0),
      quantity: r.quantity || 0,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      visitors: r.visitors || 0,
      reportDate: r.reportDate,
    }));

    const lines = [`**SKU 分析（${keyword}，共 ${rows.length} 条）**`];
    for (const r of resultRows.slice(0, 5)) {
      lines.push(
        `- ${r.store} | ${r.skuCode} | ${r.name} | 销售额 ${r.salesAmount.toFixed(2)} BRL | 件数 ${r.quantity} | 访客 ${r.visitors} | 点击 ${r.clicks}`,
      );
    }

    return {
      data: { rows: resultRows, count: resultRows.length },
      summary: lines.join('\n'),
    };
  }
}
