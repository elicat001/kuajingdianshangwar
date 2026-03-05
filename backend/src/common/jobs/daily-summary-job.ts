import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';

import { SkuMasterEntity } from '../../data/entities/sku-master.entity';
import { AlertEntity } from '../../alert/entities/alert.entity';
import { MetricSnapshotEntity } from '../../metrics/entities/metric-snapshot.entity';

@Injectable()
export class DailySummaryJob {
  private readonly logger = new Logger(DailySummaryJob.name);

  constructor(
    @InjectRepository(SkuMasterEntity)
    private readonly skuRepo: Repository<SkuMasterEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricsRepo: Repository<MetricSnapshotEntity>,
  ) {}

  @Cron('0 2 * * *')
  async handleDailySummary(): Promise<void> {
    this.logger.log('Starting daily summary job...');

    try {
      await this.escalateUnprocessedAlerts();
      this.logger.log('Daily summary job completed successfully.');
    } catch (err) {
      this.logger.error(
        `Daily summary job failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private async escalateUnprocessedAlerts(): Promise<void> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const staleAlerts = await this.alertRepo.find({
      where: {
        status: 'OPEN' as any,
        createdAt: LessThan(cutoff),
      },
    });

    this.logger.log(
      `Found ${staleAlerts.length} unprocessed alerts older than 24h`,
    );

    const severityEscalation: Record<string, string> = {
      LOW: 'MEDIUM',
      MEDIUM: 'HIGH',
      HIGH: 'CRITICAL',
      CRITICAL: 'CRITICAL',
    };

    let escalated = 0;

    for (const alert of staleAlerts) {
      const newSeverity = severityEscalation[alert.severity] ?? alert.severity;
      if (newSeverity !== alert.severity) {
        await this.alertRepo.update(alert.id, {
          severity: newSeverity as any,
        });
        escalated++;
      }
    }

    this.logger.log(`Escalated ${escalated} alerts`);
  }
}
