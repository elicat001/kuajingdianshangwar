import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    // Inject repositories as needed; placeholders below reflect expected entity structure.
    // Replace with actual entity classes once they are created.
    @InjectRepository('Sku') private readonly skuRepo: Repository<any>,
    @InjectRepository('Alert') private readonly alertRepo: Repository<any>,
    @InjectRepository('Recommendation')
    private readonly recommendationRepo: Repository<any>,
    @InjectRepository('SkuMetricsSnapshot')
    private readonly metricsRepo: Repository<any>,
    @InjectRepository('CompetitorMonitor')
    private readonly competitorRepo: Repository<any>,
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

  /**
   * Runs every hour. Pulls active SKU metrics, evaluates rules,
   * and idempotently writes alerts and recommendations.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyAlerts(): Promise<void> {
    this.logger.log('Starting hourly alert evaluation...');

    try {
      // 1. Fetch all active SKUs with latest metrics
      const activeSKUs = await this.skuRepo.find({
        where: { status: 'ACTIVE' },
      });

      this.logger.log(`Found ${activeSKUs.length} active SKUs to evaluate`);

      let totalAlerts = 0;
      let totalRecommendations = 0;

      for (const sku of activeSKUs) {
        try {
          // 2. Build rule context for each SKU
          const context = await this.buildRuleContext(sku);
          if (!context) continue;

          // 3. Evaluate rules
          const result = this.engine.evaluate(context);

          if (result.alerts.length === 0) continue;

          // 4. Idempotent write
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

  /**
   * Build the RuleContext for a given SKU by fetching metrics, competitors, and history.
   */
  private async buildRuleContext(sku: any): Promise<RuleContext | null> {
    // Fetch latest metrics snapshot
    const latestMetrics = await this.metricsRepo.findOne({
      where: { skuId: sku.id },
      order: { createdAt: 'DESC' },
    });

    if (!latestMetrics) return null;

    // Fetch previous day metrics for comparison
    const prevMetrics = await this.metricsRepo
      .createQueryBuilder('m')
      .where('m.skuId = :skuId', { skuId: sku.id })
      .orderBy('m.createdAt', 'DESC')
      .skip(1)
      .take(1)
      .getOne();

    // Fetch competitors
    const competitors = await this.competitorRepo.find({
      where: { skuId: sku.id },
    });

    // Fetch historical data (last 14 days)
    const historicalMetrics = await this.metricsRepo
      .createQueryBuilder('m')
      .where('m.skuId = :skuId', { skuId: sku.id })
      .orderBy('m.createdAt', 'DESC')
      .take(14)
      .getMany();

    const daysOfCover = calcDaysOfCover(
      latestMetrics.available ?? 0,
      latestMetrics.avgDailyUnits7d ?? 0,
    );

    return {
      sku: {
        skuId: sku.id,
        asin: sku.asin ?? '',
        storeId: sku.storeId ?? '',
        siteId: sku.siteId ?? '',
        available: latestMetrics.available ?? 0,
        avgDailyUnits7d: latestMetrics.avgDailyUnits7d ?? 0,
        daysOfCover: daysOfCover === Infinity ? 999 : daysOfCover,
        sales24h: latestMetrics.sales24h ?? 0,
        salesPrev24h: prevMetrics?.sales24h ?? 0,
        adsSpend24h: latestMetrics.adsSpend24h ?? 0,
        adsOrders24h: latestMetrics.adsOrders24h ?? 0,
        acos24h: latestMetrics.acos24h ?? 0,
        tacos24h: latestMetrics.tacos24h ?? 0,
        price: latestMetrics.price ?? 0,
        prevPrice: prevMetrics?.price ?? latestMetrics.price ?? 0,
        rank: latestMetrics.rank ?? 0,
        prevRank: prevMetrics?.rank ?? latestMetrics.rank ?? 0,
      },
      thresholds: {
        // Default thresholds; in production these come from store/site config
        adsWasteSpendMin: 50,
        acosHigh: 40,
        competitorPriceDropPct: 5,
        competitorPriceDropHighPct: 15,
        rankSurgeThreshold: 50,
        costPerUnit: latestMetrics.costPerUnit ?? 0,
        feePerUnit: latestMetrics.feePerUnit ?? 0,
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
        acosDays: historicalMetrics.map((m: any) => m.acos24h ?? 0),
        salesDays: historicalMetrics.map((m: any) => m.sales24h ?? 0),
        spendDays: historicalMetrics.map((m: any) => m.adsSpend24h ?? 0),
        rankDays: historicalMetrics.map((m: any) => m.rank ?? 0),
      },
    };
  }

  /**
   * Write an alert and its recommendations idempotently using a dedupe key.
   * Returns true if a new alert was created, false if it already existed.
   */
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

    // Check if alert already exists
    const existing = await this.alertRepo.findOne({
      where: { dedupeKey },
    });

    if (existing) return false;

    // Insert alert
    const savedAlert = await this.alertRepo.save({
      dedupeKey,
      type: alert.type,
      severity: alert.severity,
      skuId: alert.skuId,
      asin: alert.asin,
      storeId: alert.storeId,
      siteId: alert.siteId,
      ruleId: alert.ruleId,
      ruleName: alert.ruleName,
      evidence: alert.evidence,
      status: 'OPEN',
      triggeredAt: alert.triggeredAt,
    });

    // Insert recommendations
    for (const rec of alert.recommendations) {
      await this.recommendationRepo.save({
        alertId: savedAlert.id,
        skuId: alert.skuId,
        actionType: rec.type,
        label: rec.label,
        params: rec.params,
        riskLevel: rec.riskLevel,
        status: 'PENDING',
      });
    }

    return true;
  }
}
