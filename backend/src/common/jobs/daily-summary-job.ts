import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import Redis from 'ioredis';

import { SkuMasterEntity } from '../../data/entities/sku-master.entity';
import { AlertEntity } from '../../alert/entities/alert.entity';
import { MetricSnapshotEntity } from '../../metrics/entities/metric-snapshot.entity';
import { AlertStatus, Severity } from '../enums';
import { acquireLock } from '../utils/distributed-lock';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class DailySummaryJob {
  private readonly logger = new Logger(DailySummaryJob.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(SkuMasterEntity)
    private readonly skuRepo: Repository<SkuMasterEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricsRepo: Repository<MetricSnapshotEntity>,
  ) {}

  @Cron('0 2 * * *')
  async handleDailySummary(): Promise<void> {
    const release = await acquireLock(this.redis, 'lock:daily-summary-job', 1800);
    if (!release) {
      this.logger.log('Daily summary job skipped — another instance holds the lock');
      return;
    }

    try {
      this.logger.log('Starting daily summary job...');
      await this.escalateUnprocessedAlerts();
      this.logger.log('Daily summary job completed successfully.');
    } catch (err) {
      this.logger.error(
        `Daily summary job failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      await release();
    }
  }

  private async escalateUnprocessedAlerts(): Promise<void> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const staleAlerts = await this.alertRepo.find({
      where: {
        status: AlertStatus.OPEN,
        createdAt: LessThan(cutoff),
      },
    });

    this.logger.log(
      `Found ${staleAlerts.length} unprocessed alerts older than 24h`,
    );

    const severityEscalation: Record<Severity, Severity> = {
      [Severity.LOW]: Severity.MEDIUM,
      [Severity.MEDIUM]: Severity.HIGH,
      [Severity.HIGH]: Severity.CRITICAL,
      [Severity.CRITICAL]: Severity.CRITICAL,
    };

    let escalated = 0;

    for (const alert of staleAlerts) {
      const newSeverity = severityEscalation[alert.severity] ?? alert.severity;
      if (newSeverity !== alert.severity) {
        await this.alertRepo.update(alert.id, {
          severity: newSeverity,
        });
        escalated++;
      }
    }

    this.logger.log(`Escalated ${escalated} alerts`);
  }
}
