import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTool, ToolResult } from './base-tool';
import { PromotionFeeReportEntity } from '../../metrics/entities/promotion-fee-report.entity';
import { AdsFactEntity } from '../../metrics/entities/ads-fact.entity';

@Injectable()
export class PromotionTool extends AgentTool {
  name = 'promotion';

  constructor(
    @InjectRepository(PromotionFeeReportEntity)
    private readonly promoRepo: Repository<PromotionFeeReportEntity>,
    @InjectRepository(AdsFactEntity)
    private readonly adsFactRepo: Repository<AdsFactEntity>,
  ) {
    super();
  }

  async execute(companyId: string, keyword: string): Promise<ToolResult> {
    if (!keyword) {
      return { data: null, summary: '请说明要查哪个 SKU 或广告。' };
    }

    try {
      // Primary: PromotionFeeReportEntity
      const rows = await this.promoRepo
        .createQueryBuilder('p')
        .where('p.companyId = :companyId', { companyId })
        .andWhere(
          '(p.skuCode ILIKE :kw OR p.campaignName ILIKE :kw)',
          { kw: `%${keyword}%` },
        )
        .orderBy('p.reportDate', 'DESC')
        .limit(50)
        .getMany();

      if (rows.length > 0) {
        return this.buildResult(keyword, rows);
      }

      // Fallback: AdsFactEntity
      const factRows = await this.adsFactRepo
        .createQueryBuilder('a')
        .where('a.companyId = :companyId', { companyId })
        .andWhere('a.skuId ILIKE :kw', { kw: `%${keyword}%` })
        .orderBy('a.reportDate', 'DESC')
        .limit(50)
        .getMany();

      if (factRows.length > 0) {
        return this.buildFactResult(keyword, factRows);
      }

      return { data: null, summary: `未找到与「${keyword}」相关的推广费数据。` };
    } catch (error) {
      return { data: null, summary: `推广费查询出错：${error.message || error}` };
    }
  }

  private buildResult(
    keyword: string,
    rows: PromotionFeeReportEntity[],
  ): ToolResult {
    const totalSpend = rows.reduce(
      (sum, r) => sum + Number(r.promotionFee || 0),
      0,
    );

    const byStore: Record<string, number> = {};
    for (const r of rows) {
      const store = r.storeName || '';
      byStore[store] = (byStore[store] || 0) + Number(r.promotionFee || 0);
    }

    const lines = [
      `**推广费汇总（${keyword}）**`,
      `- 总花费：¥ ${totalSpend.toFixed(2)}`,
    ];
    const sortedStores = Object.keys(byStore)
      .sort((a, b) => byStore[b] - byStore[a])
      .slice(0, 10);
    for (const st of sortedStores) {
      if (st) lines.push(`- ${st}：¥ ${byStore[st].toFixed(2)}`);
    }

    return {
      data: {
        total_spend: Math.round(totalSpend * 100) / 100,
        by_store: byStore,
      },
      summary: lines.join('\n'),
    };
  }

  private buildFactResult(
    keyword: string,
    rows: AdsFactEntity[],
  ): ToolResult {
    const totalSpend = rows.reduce(
      (sum, r) => sum + Number(r.adSpend || 0),
      0,
    );

    const lines = [
      `**推广费汇总（${keyword}）**`,
      `- 总花费：¥ ${totalSpend.toFixed(2)}`,
    ];

    return {
      data: { total_spend: Math.round(totalSpend * 100) / 100 },
      summary: lines.join('\n'),
    };
  }
}
