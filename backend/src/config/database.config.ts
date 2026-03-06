import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'ai_commerce_war',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // P0-08: Always false — use migrations for schema changes
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  maxQueryExecutionTime: 1000,
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});
