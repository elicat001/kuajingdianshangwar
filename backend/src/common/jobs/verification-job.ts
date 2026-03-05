import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ActionEntity } from '../../action/entities/action.entity';
import { MetricSnapshotEntity } from '../../metrics/entities/metric-snapshot.entity';

import {
  VerificationEngine,
  MetricsSnapshot,
  VerificationInput,
  VerificationResult,
} from '../engines/verification';
import { ActionStatus } from '../enums';

@Injectable()
export class VerificationJob {
  private readonly logger = new Logger(VerificationJob.name);
  private readonly verificationEngine: VerificationEngine;

  private readonly settlingPeriodHours = 6;

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepo: Repository<ActionEntity>,
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricsRepo: Repository<MetricSnapshotEntity>,
  ) {
    this.verificationEngine = new VerificationEngine();
  }

  @Cron('0 */2 * * *')
  async handleVerification(): Promise<void> {
    this.logger.log('Starting verification job...');

    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - this.settlingPeriodHours);

      const unverifiedActions = await this.actionRepo
        .createQueryBuilder('a')
        .where('a.status = :status', { status: 'EXECUTED' })
        .andWhere('a.executedAt <= :cutoff', { cutoff })
        .andWhere('a.verificationResult IS NULL')
        .getMany();

      this.logger.log(
        `Found ${unverifiedActions.length} actions ready for verification`,
      );

      let verified = 0;
      let rollbackRecommended = 0;

      for (const action of unverifiedActions) {
        try {
          const result = await this.verifyAction(action);
          if (result) {
            verified++;
            if (result.recommendRollback) rollbackRecommended++;
          }
        } catch (err) {
          this.logger.error(
            `Error verifying action ${action.id}: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Verification complete: ${verified} verified, ${rollbackRecommended} rollback recommended`,
      );
    } catch (err) {
      this.logger.error(
        `Verification job failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private async verifyAction(action: ActionEntity): Promise<VerificationResult | null> {
    const beforeSnapshot = await this.metricsRepo
      .createQueryBuilder('m')
      .where('m.skuId = :skuId', { skuId: action.skuId })
      .andWhere('m.createdAt <= :executedAt', { executedAt: action.executedAt })
      .orderBy('m.createdAt', 'DESC')
      .getOne();

    if (!beforeSnapshot) {
      this.logger.warn(
        `No before-metrics found for action ${action.id}, skipping`,
      );
      return null;
    }

    const afterSnapshot = await this.metricsRepo
      .createQueryBuilder('m')
      .where('m.skuId = :skuId', { skuId: action.skuId })
      .andWhere('m.createdAt > :executedAt', { executedAt: action.executedAt })
      .orderBy('m.createdAt', 'DESC')
      .getOne();

    if (!afterSnapshot) {
      this.logger.warn(
        `No after-metrics found for action ${action.id}, skipping`,
      );
      return null;
    }

    const beforeMetrics: MetricsSnapshot = this.toMetricsSnapshot(beforeSnapshot);
    const afterMetrics: MetricsSnapshot = this.toMetricsSnapshot(afterSnapshot);

    const input: VerificationInput = {
      actionId: action.id,
      actionType: action.type,
      skuId: action.skuId,
      intendedValue: action.params?.targetValue ?? 0,
      beforeMetrics,
      afterMetrics,
    };

    const result = this.verificationEngine.verify(input);

    await this.actionRepo.update(action.id, {
      status: ActionStatus.VERIFIED,
      // JSONB column requires `as any` for TypeORM's DeepPartial constraint
      verificationResult: {
        gain: result.gain,
        loss: result.loss,
        netImpact: result.netImpact,
        recommendRollback: result.recommendRollback,
        reason: result.reason,
      } as any,
    });

    return result;
  }

  private toMetricsSnapshot(raw: MetricSnapshotEntity): MetricsSnapshot {
    // Metric data is stored in the JSONB `dimensions` column
    const data = (raw.dimensions as Record<string, any>) || {};
    return {
      price: data.price ?? 0,
      sales24h: data.sales24h ?? 0,
      units24h: data.units24h ?? 0,
      rank: data.rank ?? 0,
      adsSpend24h: data.adsSpend24h ?? 0,
      adsOrders24h: data.adsOrders24h ?? 0,
      acos: data.acos24h ?? data.acos ?? 0,
      tacos: data.tacos24h ?? data.tacos ?? 0,
      available: data.available ?? 0,
      snapshotAt: raw.createdAt ?? new Date(),
    };
  }
}
