import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { MetricsModule } from './metrics/metrics.module';
import { AlertModule } from './alert/alert.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { ActionModule } from './action/action.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    AuthModule,
    DataModule,
    MetricsModule,
    AlertModule,
    RecommendationModule,
    ActionModule,
  ],
})
export class AppModule {}
