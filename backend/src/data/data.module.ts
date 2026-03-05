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
    ]),
  ],
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
