import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // P0-01: Validate critical environment variables at startup
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error(
      'FATAL: JWT_SECRET must be set and at least 32 characters long. Aborting.',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  // Security headers
  app.use(helmet());

  app.setGlobalPrefix('api');

  // CORS — require explicit ALLOWED_ORIGINS in production
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
    console.error('FATAL: ALLOWED_ORIGINS must be set in production. Aborting.');
    process.exit(1);
  }
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI Commerce War OS')
      .setDescription('Cross-border E-commerce AI Operation System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
