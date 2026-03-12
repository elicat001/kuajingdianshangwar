import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductTestEntity } from '../../product-test/entities/product-test.entity';
import { ProductTestService } from '../../product-test/product-test.service';
import { evaluateGate } from '../../product-test/engines/gate-evaluator';
import { AlertEntity } from '../../alert/entities/alert.entity';
import { AlertStatus } from '../enums';
import { acquireLock } from '../utils/distributed-lock';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class GateEvaluationJob {
  private readonly logger = new Logger(GateEvaluationJob.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(ProductTestEntity)
    private readonly testRepo: Repository<ProductTestEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    private readonly testService: ProductTestService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 4 * * *')
  async handleGateEvaluation(): Promise<void> {
    const release = await acquireLock(this.redis, 'lock:gate-evaluation-job', 3600);
    if (!release) {
      this.logger.log('Gate evaluation job skipped — another instance holds the lock');
      return;
    }

    try {
      this.logger.log('Starting daily gate evaluation...');

      const activeTests = await this.testRepo.find({
        where: { status: 'ACTIVE' },
      });

      this.logger.log(`Found ${activeTests.length} active product tests`);

      let advanceReady = 0;
      let killed = 0;

      for (const test of activeTests) {
        try {
          const metrics = await this.testService.getTestMetrics(test.companyId, test.id);
          const criteria = (test.config as Record<string, any>)?.[test.currentGate] || {};
          const evaluation = evaluateGate(criteria, metrics);

          if (evaluation.shouldKill) {
            // Auto-kill: ACOS too high or return rate too high
            await this.testService.killTest(test.companyId, test.id, `Auto-kill: ${evaluation.failedCriteria.join(', ')}`, 'SYSTEM');
            killed++;
            this.logger.log(`Auto-killed test ${test.testName} (${test.id}): ${evaluation.failedCriteria.join(', ')}`);
          } else if (evaluation.passed) {
            // Gate criteria met - create alert for manual review
            advanceReady++;
            await this.alertRepo.save(
              this.alertRepo.create({
                companyId: test.companyId,
                type: 'RANK_CHANGE' as any, // Reuse existing alert type
                severity: 'LOW' as any,
                status: AlertStatus.OPEN,
                skuId: test.skuId,
                title: `Product Test "${test.testName}" ready to advance from ${test.currentGate}`,
                message: JSON.stringify({ testId: test.id, gate: test.currentGate, metrics, evaluation }),
                evidenceJson: { testId: test.id, gate: test.currentGate, metrics, evaluation },
              }),
            );
            this.logger.log(`Test ${test.testName} ready to advance from ${test.currentGate}`);
          }
        } catch (err) {
          this.logger.error(`Error evaluating test ${test.id}: ${(err as Error).message}`);
        }
      }

      this.logger.log(`Gate evaluation complete: ${advanceReady} ready to advance, ${killed} auto-killed`);
    } catch (err) {
      this.logger.error(`Gate evaluation job failed: ${(err as Error).message}`, (err as Error).stack);
    } finally {
      await release();
    }
  }
}
