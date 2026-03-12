import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTool, ToolResult } from './base-tool';
import { SkuSalesReportEntity } from '../../metrics/entities/sku-sales-report.entity';
import { SalesFactEntity } from '../../metrics/entities/sales-fact.entity';
import { SkuMasterEntity } from '../../data/entities/sku-master.entity';

@Injectable()
export class SalesTool extends AgentTool {
  name = 'sales';

  constructor(
    @InjectRepository(SkuSalesReportEntity)
    private readonly skuSalesRepo: Repository<SkuSalesReportEntity>,
    @InjectRepository(SalesFactEntity)
    private readonly salesFactRepo: Repository<SalesFactEntity>,
    @InjectRepository(SkuMasterEntity)
    private readonly skuMasterRepo: Repository<SkuMasterEntity>,
  ) {
    super();
  }

  async execute(companyId: string, keyword: string): Promise<ToolResult> {
    if (!keyword) {
      return { data: null, summary: '请说明要查哪个 SKU 或品名。' };
    }

    try {
      // Primary: query SkuSalesReportEntity
      const rows = await this.skuSalesRepo
        .createQueryBuilder('s')
        .where('s.companyId = :companyId', { companyId })
        .andWhere(
          '(s.skuCode ILIKE :kw OR s.productName ILIKE :kw)',
          { kw: `%${keyword}%` },
        )
        .orderBy('s.reportDate', 'DESC')
        .limit(50)
        .getMany();

      if (rows.length > 0) {
        return this.buildResult(keyword, rows);
      }

      // Fallback: SalesFactEntity + SkuMasterEntity
      const skuIds = await this.skuMasterRepo
        .createQueryBuilder('m')
        .select('m.id')
        .where('m.companyId = :companyId', { companyId })
        .andWhere('(m.sku ILIKE :kw OR m.title ILIKE :kw)', { kw: `%${keyword}%` })
        .getMany();

      if (skuIds.length > 0) {
        const ids = skuIds.map((s) => s.id);
        const factRows = await this.salesFactRepo
          .createQueryBuilder('f')
          .where('f.companyId = :companyId', { companyId })
          .andWhere('f.skuId IN (:...ids)', { ids })
          .orderBy('f.reportDate', 'DESC')
          .limit(50)
          .getMany();

        if (factRows.length > 0) {
          return this.buildFactResult(keyword, factRows);
        }
      }

      return { data: null, summary: `未找到与「${keyword}」相关的销量数据。` };
    } catch (error) {
      return { data: null, summary: `销量查询出错：${error.message || error}` };
    }
  }

  private buildResult(
    keyword: string,
    rows: SkuSalesReportEntity[],
  ): ToolResult {
    const totalQty = rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
    const totalSales = rows.reduce(
      (sum, r) => sum + Number(r.salesAmount || 0),
      0,
    );

    const byDate: Record<string, { qty: number; sales: number }> = {};
    for (const r of rows) {
      const d = r.reportDate
        ? new Date(r.reportDate).toISOString().slice(0, 10)
        : r.reportPeriod || '';
      if (!byDate[d]) byDate[d] = { qty: 0, sales: 0 };
      byDate[d].qty += r.quantity || 0;
      byDate[d].sales += Number(r.salesAmount || 0);
    }

    const lines = [
      `**销量汇总（${keyword}）**`,
      `- 总件数（已付款）：${totalQty}`,
      `- 总销售额（BRL）：${totalSales.toFixed(2)}`,
    ];
    const sortedDates = Object.keys(byDate).sort().slice(-7);
    for (const d of sortedDates) {
      lines.push(
        `- ${d}：件数 ${byDate[d].qty}，销售额 ${byDate[d].sales.toFixed(2)} BRL`,
      );
    }

    return {
      data: {
        total_qty: totalQty,
        total_sales: Math.round(totalSales * 100) / 100,
        by_date: byDate,
      },
      summary: lines.join('\n'),
    };
  }

  private buildFactResult(
    keyword: string,
    rows: SalesFactEntity[],
  ): ToolResult {
    const totalQty = rows.reduce((sum, r) => sum + (r.unitsOrdered || 0), 0);
    const totalSales = rows.reduce(
      (sum, r) => sum + Number(r.orderedRevenue || 0),
      0,
    );

    const byDate: Record<string, { qty: number; sales: number }> = {};
    for (const r of rows) {
      const d = r.reportDate
        ? new Date(r.reportDate).toISOString().slice(0, 10)
        : '';
      if (!byDate[d]) byDate[d] = { qty: 0, sales: 0 };
      byDate[d].qty += r.unitsOrdered || 0;
      byDate[d].sales += Number(r.orderedRevenue || 0);
    }

    const lines = [
      `**销量汇总（${keyword}）**`,
      `- 总件数：${totalQty}`,
      `- 总销售额：${totalSales.toFixed(2)}`,
    ];
    const sortedDates = Object.keys(byDate).sort().slice(-7);
    for (const d of sortedDates) {
      lines.push(
        `- ${d}：件数 ${byDate[d].qty}，销售额 ${byDate[d].sales.toFixed(2)}`,
      );
    }

    return {
      data: {
        total_qty: totalQty,
        total_sales: Math.round(totalSales * 100) / 100,
        by_date: byDate,
      },
      summary: lines.join('\n'),
    };
  }
}
