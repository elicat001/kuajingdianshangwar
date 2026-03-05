import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkuMasterEntity } from '../../data/entities/sku-master.entity';
import { AlertEntity } from '../../alert/entities/alert.entity';
import { RecommendationEntity } from '../../recommendation/entities/recommendation.entity';
import { MetricSnapshotEntity } from '../../metrics/entities/metric-snapshot.entity';
import { CompetitorEntity } from '../../data/entities/competitor.entity';
import { ActionEntity } from '../../action/entities/action.entity';

import { HourlyAlertJob } from './hourly-alert-job';
import { DailySummaryJob } from './daily-summary-job';
import { VerificationJob } from './verification-job';

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
    ]),
  ],
  providers: [HourlyAlertJob, DailySummaryJob, VerificationJob],
})
export class JobsModule {}
