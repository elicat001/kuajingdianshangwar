import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { DataUploadEntity } from './entities/data-upload.entity';
// New report entities
import { SkuSalesReportEntity } from '../metrics/entities/sku-sales-report.entity';
import { InventoryReportEntity } from '../metrics/entities/inventory-report.entity';
import { PromotionFeeReportEntity } from '../metrics/entities/promotion-fee-report.entity';
import { ProductPerformanceReportEntity } from '../metrics/entities/product-performance-report.entity';
// Backward-compat fact entities
import { SalesFactEntity } from '../metrics/entities/sales-fact.entity';
import { AdsFactEntity } from '../metrics/entities/ads-fact.entity';
import { InventoryFactEntity } from '../metrics/entities/inventory-fact.entity';
import { ProductPerformanceEntity } from '../metrics/entities/product-performance.entity';
// SKU Master
import { SkuMasterEntity } from '../data/entities/sku-master.entity';
// Importers
import {
  SalesReportImporter,
  InventoryReportImporter,
  PromotionFeeImporter,
  ProductPerformanceImporter,
  ProductInfoImporter,
} from './importers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataUploadEntity,
      // New report tables
      SkuSalesReportEntity,
      InventoryReportEntity,
      PromotionFeeReportEntity,
      ProductPerformanceReportEntity,
      // Backward-compat fact tables
      SalesFactEntity,
      AdsFactEntity,
      InventoryFactEntity,
      ProductPerformanceEntity,
      // SKU Master
      SkuMasterEntity,
    ]),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    // Importers
    SalesReportImporter,
    InventoryReportImporter,
    PromotionFeeImporter,
    ProductPerformanceImporter,
    ProductInfoImporter,
  ],
})
export class UploadModule {}
