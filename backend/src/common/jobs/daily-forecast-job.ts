import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { SkuMasterEntity } from '../../data/entities/sku-master.entity';
import { InventoryFactEntity } from '../../metrics/entities/inventory-fact.entity';
import { ForecastService } from '../../forecast/forecast.service';
import { SkuStatus } from '../enums';
import { acquireLock } from '../utils/distributed-lock';
import { REDIS_CLIENT } from '../redis/redis.module';

const BATCH_SIZE = 200;

@Injectable()
export class DailyForecastJob {
  private readonly logger = new Logger(DailyForecastJob.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(SkuMasterEntity)
    private readonly skuRepo: Repository<SkuMasterEntity>,
    @InjectRepository(InventoryFactEntity)
    private readonly inventoryRepo: Repository<InventoryFactEntity>,
    private readonly forecastService: ForecastService,
  ) {}

  @Cron('0 3 * * *')
  async handleDailyForecast(): Promise<void> {
    const release = await acquireLock(this.redis, 'lock:daily-forecast-job', 7200);
    if (!release) {
      this.logger.log('Daily forecast job skipped — another instance holds the lock');
      return;
    }

    try {
      this.logger.log('Starting daily forecast generation...');

      const totalCount = await this.skuRepo.count({ where: { status: SkuStatus.ACTIVE } });
      this.logger.log(`Found ${totalCount} active SKUs`);

      let forecastCount = 0;
      let suggestionCount = 0;
      let errorCount = 0;

      for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
        const batch = await this.skuRepo.find({
          where: { status: SkuStatus.ACTIVE },
          skip: offset,
          take: BATCH_SIZE,
        });

        for (const sku of batch) {
          try {
            // Generate forecast
            const forecast = await this.forecastService.generateForecast(sku.companyId, {
              skuId: sku.id,
              horizonDays: 30,
              modelType: 'EXP_SMOOTHING',
            });
            forecastCount++;

            // Check if reorder suggestion is needed
            const inventory = await this.inventoryRepo.findOne({
              where: { companyId: sku.companyId, skuId: sku.id },
              order: { reportDate: 'DESC' },
            });

            const currentStock = inventory?.fulfillableQty ?? 0;
            const predictedDemand = forecast.predictedUnits;

            // If predicted demand exceeds 70% of current stock, generate reorder suggestion
            if (predictedDemand > currentStock * 0.7) {
              await this.forecastService.generateReorderSuggestion(sku.companyId, sku.id, forecast.id);
              suggestionCount++;
            }
          } catch (err) {
            errorCount++;
            this.logger.error(`Error forecasting SKU ${sku.id}: ${(err as Error).message}`);
          }
        }
      }

      this.logger.log(
        `Daily forecast complete: ${forecastCount} forecasts, ${suggestionCount} reorder suggestions, ${errorCount} errors`,
      );
    } catch (err) {
      this.logger.error(`Daily forecast job failed: ${(err as Error).message}`, (err as Error).stack);
    } finally {
      await release();
    }
  }
}
