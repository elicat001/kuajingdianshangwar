import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { databaseConfig } from './config/database.config';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { MetricsModule } from './metrics/metrics.module';
import { AlertModule } from './alert/alert.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { ActionModule } from './action/action.module';
import { JobsModule } from './common/jobs/jobs.module';
import { UploadModule } from './upload/upload.module';
import { AgentModule } from './agent/agent.module';
import { ForecastModule } from './forecast/forecast.module';
import { ProductTestModule } from './product-test/product-test.module';
import { SupplyChainModule } from './supply-chain/supply-chain.module';
import { BudgetMigrationModule } from './budget-migration/budget-migration.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    RedisModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    AuthModule,
    DataModule,
    MetricsModule,
    AlertModule,
    RecommendationModule,
    ActionModule,
    JobsModule,
    UploadModule,
    AgentModule,
    ForecastModule,
    ProductTestModule,
    SupplyChainModule,
    BudgetMigrationModule,
  ],
})
export class AppModule {}
