import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  VerificationEngine,
  MetricsSnapshot,
  VerificationInput,
} from '../engines/verification';

@Injectable()
export class VerificationJob {
  private readonly logger = new Logger(VerificationJob.name);
  private readonly verificationEngine: VerificationEngine;

  /** Hours to wait after execution before verifying */
  private readonly settlingPeriodHours = 6;

  constructor(
    @InjectRepository('SuggestedAction')
    private readonly actionRepo: Repository<any>,
    @InjectRepository('SkuMetricsSnapshot')
    private readonly metricsRepo: Repository<any>,
    @InjectRepository('ActionVerification')
    private readonly verificationRepo: Repository<any>,
  ) {
    this.verificationEngine = new VerificationEngine();
  }

  /**
   * Runs every 2 hours.
   * Scans executed but unverified actions, compares before/after metrics,
   * writes verification results, and flags actions needing rollback.
   */
  @Cron('0 */2 * * *')
  async handleVerification(): Promise<void> {
    this.logger.log('Starting verification job...');

    try {
      // 1. Find executed but unverified actions past the settling period
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - this.settlingPeriodHours);

      const unverifiedActions = await this.actionRepo
        .createQueryBuilder('a')
        .where('a.status = :status', { status: 'EXECUTED' })
        .andWhere('a.executedAt <= :cutoff', { cutoff })
        .andWhere('a.verifiedAt IS NULL')
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

  /**
   * Verify a single action by fetching before/after metrics and running
   * the verification engine.
   */
  private async verifyAction(action: any): Promise<any | null> {
    // Fetch "before" metrics snapshot (closest to executedAt, but before it)
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

    // Fetch "after" metrics snapshot (latest available after settling period)
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
      actionType: action.actionType,
      skuId: action.skuId,
      intendedValue: action.intendedValue ?? 0,
      beforeMetrics,
      afterMetrics,
    };

    const result = this.verificationEngine.verify(input);

    // Write verification result
    await this.verificationRepo.save({
      actionId: action.id,
      skuId: action.skuId,
      gain: result.gain,
      loss: result.loss,
      netImpact: result.netImpact,
      sideEffects: result.sideEffects,
      recommendRollback: result.recommendRollback,
      reason: result.reason,
      verifiedAt: result.verifiedAt,
    });

    // Update action status
    const newStatus = result.recommendRollback
      ? 'VERIFIED' // Mark as verified; rollback is a separate decision
      : 'VERIFIED';

    await this.actionRepo.update(action.id, {
      status: newStatus,
      verifiedAt: result.verifiedAt,
      verificationResult: {
        gain: result.gain,
        loss: result.loss,
        netImpact: result.netImpact,
        recommendRollback: result.recommendRollback,
        reason: result.reason,
      },
    });

    // If rollback is recommended, flag the action
    if (result.recommendRollback) {
      this.logger.warn(
        `Rollback recommended for action ${action.id} (SKU: ${action.skuId}): ${result.reason}`,
      );
      await this.actionRepo.update(action.id, {
        rollbackRecommended: true,
        rollbackReason: result.reason,
      });
    }

    return result;
  }

  /**
   * Convert a raw metrics entity into a MetricsSnapshot.
   */
  private toMetricsSnapshot(raw: any): MetricsSnapshot {
    return {
      price: raw.price ?? 0,
      sales24h: raw.sales24h ?? 0,
      units24h: raw.units24h ?? 0,
      rank: raw.rank ?? 0,
      adsSpend24h: raw.adsSpend24h ?? 0,
      adsOrders24h: raw.adsOrders24h ?? 0,
      acos: raw.acos24h ?? raw.acos ?? 0,
      tacos: raw.tacos24h ?? raw.tacos ?? 0,
      available: raw.available ?? 0,
      snapshotAt: raw.createdAt ?? new Date(),
    };
  }
}
