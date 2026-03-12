import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { SalesFactEntity } from './entities/sales-fact.entity';
import { AdsFactEntity } from './entities/ads-fact.entity';
import { InventoryFactEntity } from './entities/inventory-fact.entity';
import { ProductPerformanceEntity } from './entities/product-performance.entity';
import { SkuSalesReportEntity } from './entities/sku-sales-report.entity';
import { InventoryReportEntity } from './entities/inventory-report.entity';
import { PromotionFeeReportEntity } from './entities/promotion-fee-report.entity';
import { ProductPerformanceReportEntity } from './entities/product-performance-report.entity';
import { AlertEntity } from '../alert/entities/alert.entity';
import { StorePromoterMappingEntity } from '../data/entities/store-promoter-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MetricSnapshotEntity,
      SalesFactEntity,
      AdsFactEntity,
      InventoryFactEntity,
      ProductPerformanceEntity,
      SkuSalesReportEntity,
      InventoryReportEntity,
      PromotionFeeReportEntity,
      ProductPerformanceReportEntity,
      AlertEntity,
      StorePromoterMappingEntity,
    ]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
