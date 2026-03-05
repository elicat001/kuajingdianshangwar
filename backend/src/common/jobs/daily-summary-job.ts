import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';

@Injectable()
export class DailySummaryJob {
  private readonly logger = new Logger(DailySummaryJob.name);

  constructor(
    @InjectRepository('Sku') private readonly skuRepo: Repository<any>,
    @InjectRepository('Alert') private readonly alertRepo: Repository<any>,
    @InjectRepository('SkuMetricsSnapshot')
    private readonly metricsRepo: Repository<any>,
    @InjectRepository('DailySummary')
    private readonly dailySummaryRepo: Repository<any>,
  ) {}

  /**
   * Runs every day at 02:00 AM.
   * - Generates daily metric snapshots per SKU
   * - Escalates unprocessed alerts older than 24h
   */
  @Cron('0 2 * * *')
  async handleDailySummary(): Promise<void> {
    this.logger.log('Starting daily summary job...');

    try {
      await this.generateDailySnapshots();
      await this.escalateUnprocessedAlerts();

      this.logger.log('Daily summary job completed successfully.');
    } catch (err) {
      this.logger.error(
        `Daily summary job failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Generate daily metric snapshots for all active SKUs.
   * Aggregates hourly data into a daily summary record.
   */
  private async generateDailySnapshots(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSKUs = await this.skuRepo.find({
      where: { status: 'ACTIVE' },
    });

    this.logger.log(
      `Generating daily snapshots for ${activeSKUs.length} active SKUs`,
    );

    let created = 0;

    for (const sku of activeSKUs) {
      try {
        // Aggregate hourly metrics for the day
        const dailyData = await this.metricsRepo
          .createQueryBuilder('m')
          .select([
            'AVG(m.price) as avgPrice',
            'MIN(m.price) as minPrice',
            'MAX(m.price) as maxPrice',
            'SUM(m.sales24h) as totalSales',
            'SUM(m.adsSpend24h) as totalAdsSpend',
            'SUM(m.adsOrders24h) as totalAdsOrders',
            'AVG(m.acos24h) as avgAcos',
            'AVG(m.rank) as avgRank',
            'MIN(m.rank) as bestRank',
            'MAX(m.available) as maxAvailable',
            'MIN(m.available) as minAvailable',
          ])
          .where('m.skuId = :skuId', { skuId: sku.id })
          .andWhere('m.createdAt >= :start', { start: yesterday })
          .andWhere('m.createdAt < :end', { end: today })
          .getRawOne();

        if (!dailyData) continue;

        // Check for existing summary (idempotent)
        const dateStr = yesterday.toISOString().split('T')[0];
        const existing = await this.dailySummaryRepo.findOne({
          where: { skuId: sku.id, date: dateStr },
        });

        if (existing) continue;

        await this.dailySummaryRepo.save({
          skuId: sku.id,
          storeId: sku.storeId,
          siteId: sku.siteId,
          date: dateStr,
          avgPrice: parseFloat(dailyData.avgPrice ?? 0),
          minPrice: parseFloat(dailyData.minPrice ?? 0),
          maxPrice: parseFloat(dailyData.maxPrice ?? 0),
          totalSales: parseFloat(dailyData.totalSales ?? 0),
          totalAdsSpend: parseFloat(dailyData.totalAdsSpend ?? 0),
          totalAdsOrders: parseInt(dailyData.totalAdsOrders ?? 0, 10),
          avgAcos: parseFloat(dailyData.avgAcos ?? 0),
          avgRank: parseFloat(dailyData.avgRank ?? 0),
          bestRank: parseInt(dailyData.bestRank ?? 0, 10),
          maxAvailable: parseInt(dailyData.maxAvailable ?? 0, 10),
          minAvailable: parseInt(dailyData.minAvailable ?? 0, 10),
        });

        created++;
      } catch (err) {
        this.logger.error(
          `Error creating daily snapshot for SKU ${sku.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Created ${created} daily snapshots`);
  }

  /**
   * Escalate unprocessed (OPEN) alerts older than 24 hours.
   * Increases severity by one level and logs the escalation.
   */
  private async escalateUnprocessedAlerts(): Promise<void> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const staleAlerts = await this.alertRepo.find({
      where: {
        status: 'OPEN',
        triggeredAt: LessThan(cutoff),
      },
    });

    this.logger.log(
      `Found ${staleAlerts.length} unprocessed alerts older than 24h`,
    );

    const severityEscalation: Record<string, string> = {
      LOW: 'MEDIUM',
      MEDIUM: 'HIGH',
      HIGH: 'CRITICAL',
      CRITICAL: 'CRITICAL', // already at max
    };

    let escalated = 0;

    for (const alert of staleAlerts) {
      const newSeverity = severityEscalation[alert.severity] ?? alert.severity;
      if (newSeverity !== alert.severity) {
        await this.alertRepo.update(alert.id, {
          severity: newSeverity,
          escalatedAt: new Date(),
          escalationNote: `Auto-escalated from ${alert.severity} to ${newSeverity} after 24h without acknowledgment`,
        });
        escalated++;
      }
    }

    this.logger.log(`Escalated ${escalated} alerts`);
  }
}
