import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetMigrationEntity } from './entities/budget-migration.entity';
import { AdsFactEntity } from '../metrics/entities/ads-fact.entity';
import { BudgetMigrationService } from './budget-migration.service';
import { BudgetMigrationController } from './budget-migration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BudgetMigrationEntity, AdsFactEntity])],
  controllers: [BudgetMigrationController],
  providers: [BudgetMigrationService],
  exports: [BudgetMigrationService],
})
export class BudgetMigrationModule {}
