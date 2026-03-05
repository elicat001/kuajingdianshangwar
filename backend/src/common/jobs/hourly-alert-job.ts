import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SkuMasterEntity } from '../../data/entities/sku-master.entity';
import { AlertEntity } from '../../alert/entities/alert.entity';
import { RecommendationEntity } from '../../recommendation/entities/recommendation.entity';
import { MetricSnapshotEntity } from '../../metrics/entities/metric-snapshot.entity';
import { CompetitorEntity } from '../../data/entities/competitor.entity';

import { RuleEngine, RuleContext, AlertResult } from '../engines/rule-engine';
import { STOCKOUT_RULES } from '../engines/stockout-rules';
import { ADS_RULES } from '../engines/ads-rules';
import { COMPETITOR_RULES } from '../engines/competitor-rules';
import { PRICING_RULES } from '../engines/pricing-rules';
import { generateDedupeKey } from '../utils/dedupe';
import { calcDaysOfCover } from '../utils/metrics-calculator';

@Injectable()
export class HourlyAlertJob {
  private readonly logger = new Logger(HourlyAlertJob.name);
  private readonly engine: RuleEngine;

  constructor(
    @InjectRepository(SkuMasterEntity)
    private readonly skuRepo: Repository<SkuMasterEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    @InjectRepository(RecommendationEntity)
    private readonly recommendationRepo: Repository<RecommendationEntity>,
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricsRepo: Repository<MetricSnapshotEntity>,
    @InjectRepository(CompetitorEntity)
    private readonly competitorRepo: Repository<CompetitorEntity>,
  ) {
    this.engine = new RuleEngine();
    this.registerAllRules();
  }

  private registerAllRules(): void {
    const allRules = [
      ...STOCKOUT_RULES,
      ...ADS_RULES,
      ...COMPETITOR_RULES,
      ...PRICING_RULES,
    ];
    for (const rule of allRules) {
      this.engine.registerRule(rule);
    }
    this.logger.log(`Registered ${allRules.length} rules`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyAlerts(): Promise<void> {
    this.logger.log('Starting hourly alert evaluation...');

    try {
      const activeSKUs = await this.skuRepo.find({
        where: { status: 'ACTIVE' as any },
      });

      this.logger.log(`Found ${activeSKUs.length} active SKUs to evaluate`);

      let totalAlerts = 0;
      let totalRecommendations = 0;

      for (const sku of activeSKUs) {
        try {
          const context = await this.buildRuleContext(sku);
          if (!context) continue;

          const result = this.engine.evaluate(context);

          if (result.alerts.length === 0) continue;

          for (const alert of result.alerts) {
            const written = await this.writeAlertIdempotent(alert);
            if (written) {
              totalAlerts++;
              totalRecommendations += alert.recommendations.length;
            }
          }
        } catch (err) {
          this.logger.error(
            `Error evaluating SKU ${sku.id}: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Hourly alert evaluation complete: ${totalAlerts} new alerts, ${totalRecommendations} recommendations`,
      );
    } catch (err) {
      this.logger.error(
        `Hourly alert job failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private async buildRuleContext(sku: SkuMasterEntity): Promise<RuleContext | null> {
    const latestMetrics = await this.metricsRepo.findOne({
      where: { skuId: sku.id },
      order: { createdAt: 'DESC' },
    });

    if (!latestMetrics) return null;

    const prevMetrics = await this.metricsRepo
      .createQueryBuilder('m')
      .where('m.skuId = :skuId', { skuId: sku.id })
      .orderBy('m.createdAt', 'DESC')
      .skip(1)
      .take(1)
      .getOne();

    const competitors = await this.competitorRepo.find({
      where: { skuId: sku.id },
    });

    const historicalMetrics = await this.metricsRepo
      .createQueryBuilder('m')
      .where('m.skuId = :skuId', { skuId: sku.id })
      .orderBy('m.createdAt', 'DESC')
      .take(14)
      .getMany();

    const data = (latestMetrics as any).data || {};
    const prevData = (prevMetrics as any)?.data || {};

    const daysOfCover = calcDaysOfCover(
      data.available ?? 0,
      data.avgDailyUnits7d ?? 0,
    );

    return {
      sku: {
        skuId: sku.id,
        asin: sku.asin ?? '',
        storeId: sku.storeId ?? '',
        siteId: sku.siteId ?? '',
        available: data.available ?? 0,
        avgDailyUnits7d: data.avgDailyUnits7d ?? 0,
        daysOfCover: daysOfCover === Infinity ? 999 : daysOfCover,
        sales24h: data.sales24h ?? 0,
        salesPrev24h: prevData.sales24h ?? 0,
        adsSpend24h: data.adsSpend24h ?? 0,
        adsOrders24h: data.adsOrders24h ?? 0,
        acos24h: data.acos24h ?? 0,
        tacos24h: data.tacos24h ?? 0,
        price: data.price ?? 0,
        prevPrice: prevData.price ?? data.price ?? 0,
        rank: data.rank ?? 0,
        prevRank: prevData.rank ?? data.rank ?? 0,
      },
      thresholds: {
        adsWasteSpendMin: 50,
        acosHigh: 40,
        competitorPriceDropPct: 5,
        competitorPriceDropHighPct: 15,
        rankSurgeThreshold: 50,
        costPerUnit: data.costPerUnit ?? 0,
        feePerUnit: data.feePerUnit ?? 0,
        marginFloorPct: 10,
        priceWarDropPct: 3,
        priceWarMinDropCount: 2,
      },
      competitors: competitors.map((c: any) => ({
        competitorAsin: c.competitorAsin,
        price: c.currentPrice ?? 0,
        prevPrice: c.prevPrice ?? 0,
        rank: c.currentRank ?? 0,
        prevRank: c.prevRank ?? 0,
        reviewCount: c.reviewCount ?? 0,
        prevReviewCount: c.prevReviewCount ?? 0,
        avgDailyReviews: c.avgDailyReviews ?? 0,
        rating: c.rating ?? 0,
      })),
      history: {
        acosDays: historicalMetrics.map((m: any) => m.data?.acos24h ?? 0),
        salesDays: historicalMetrics.map((m: any) => m.data?.sales24h ?? 0),
        spendDays: historicalMetrics.map((m: any) => m.data?.adsSpend24h ?? 0),
        rankDays: historicalMetrics.map((m: any) => m.data?.rank ?? 0),
      },
    };
  }

  private async writeAlertIdempotent(alert: AlertResult): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
    ).toISOString();
    const windowEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours() + 1,
    ).toISOString();

    const dedupeKey = generateDedupeKey(
      alert.ruleId,
      alert.skuId,
      windowStart,
      windowEnd,
    );

    const existing = await this.alertRepo.findOne({
      where: { dedupeKey },
    });

    if (existing) return false;

    const savedAlert = await this.alertRepo.save({
      dedupeKey,
      type: alert.type,
      severity: alert.severity,
      skuId: alert.skuId,
      storeId: alert.storeId,
      siteId: alert.siteId,
      title: alert.ruleName,
      message: JSON.stringify(alert.evidence),
      evidenceJson: alert.evidence,
      status: 'OPEN' as any,
      windowStart: new Date(windowStart),
      windowEnd: new Date(windowEnd),
    } as any);

    for (const rec of alert.recommendations) {
      await this.recommendationRepo.save({
        alertId: savedAlert.id,
        skuId: alert.skuId,
        rationale: rec.label,
        suggestedActions: [{ type: rec.type, params: rec.params }],
        riskLevel: rec.riskLevel,
        status: 'PENDING' as any,
      } as any);
    }

    return true;
  }
}
