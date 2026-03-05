import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { SalesFactEntity } from './entities/sales-fact.entity';
import { AdsFactEntity } from './entities/ads-fact.entity';
import { InventoryFactEntity } from './entities/inventory-fact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MetricSnapshotEntity,
      SalesFactEntity,
      AdsFactEntity,
      InventoryFactEntity,
    ]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
