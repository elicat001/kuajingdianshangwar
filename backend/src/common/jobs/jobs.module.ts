import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkuMasterEntity } from '../../data/entities/sku-master.entity';
import { AlertEntity } from '../../alert/entities/alert.entity';
import { RecommendationEntity } from '../../recommendation/entities/recommendation.entity';
import { MetricSnapshotEntity } from '../../metrics/entities/metric-snapshot.entity';
import { CompetitorEntity } from '../../data/entities/competitor.entity';
import { ActionEntity } from '../../action/entities/action.entity';
import { ConfigThresholdEntity } from '../../data/entities/config-threshold.entity';
import { InventoryFactEntity } from '../../metrics/entities/inventory-fact.entity';
import { ProductTestEntity } from '../../product-test/entities/product-test.entity';

import { ForecastModule } from '../../forecast/forecast.module';
import { ProductTestModule } from '../../product-test/product-test.module';

import { HourlyAlertJob } from './hourly-alert-job';
import { DailySummaryJob } from './daily-summary-job';
import { VerificationJob } from './verification-job';
import { DailyForecastJob } from './daily-forecast-job';
import { GateEvaluationJob } from './gate-evaluation-job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      SkuMasterEntity,
      AlertEntity,
      RecommendationEntity,
      MetricSnapshotEntity,
      CompetitorEntity,
      ActionEntity,
      ConfigThresholdEntity,
      InventoryFactEntity,
      ProductTestEntity,
    ]),
    ForecastModule,
    ProductTestModule,
  ],
  providers: [HourlyAlertJob, DailySummaryJob, VerificationJob, DailyForecastJob, GateEvaluationJob],
})
export class JobsModule {}
