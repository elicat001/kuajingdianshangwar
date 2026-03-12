import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataService } from './data.service';
import { DataController } from './data.controller';
import { StoreEntity } from './entities/store.entity';
import { SiteEntity } from './entities/site.entity';
import { StoreSiteBindingEntity } from './entities/store-site-binding.entity';
import { SkuMasterEntity } from './entities/sku-master.entity';
import { CompetitorEntity } from './entities/competitor.entity';
import { CompetitorSnapshotEntity } from './entities/competitor-snapshot.entity';
import { MetricDefEntity } from './entities/metric-def.entity';
import { MetricDefVersionEntity } from './entities/metric-def-version.entity';
import { ConfigThresholdEntity } from './entities/config-threshold.entity';
import {
  SkuShopeePriceEntity,
  SkuTemuPriceEntity,
  SkuMercadolibrePriceEntity,
} from './entities/sku-platform-price.entity';
import { StorePromoterMappingEntity } from './entities/store-promoter-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreEntity,
      SiteEntity,
      StoreSiteBindingEntity,
      SkuMasterEntity,
      CompetitorEntity,
      CompetitorSnapshotEntity,
      MetricDefEntity,
      MetricDefVersionEntity,
      ConfigThresholdEntity,
      SkuShopeePriceEntity,
      SkuTemuPriceEntity,
      SkuMercadolibrePriceEntity,
      StorePromoterMappingEntity,
    ]),
  ],
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
