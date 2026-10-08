import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

/**
 * BACKEND.md §2 / §10.1 HTTP bootstrap: `/api/v1` prefix, explicit CORS, the
 * security-header set, `X-Request-Id` (§5) and strict input validation mapped to
 * the §5 `422 validation_failed` shape by the global AllExceptionsFilter.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  const port = config.get<number>('app.port') ?? 3000;
  const prefix = config.get<string>('app.globalPrefix') ?? 'api/v1';
  const origins = config.get<string[]>('app.corsOrigins') ?? [];

  app.setGlobalPrefix(prefix);

  // §8 media bytes PUTs carry the file's own Content-Type (image/*, …), which
  // neither the json nor the urlencoded parser consumes — without a raw parser
  // `req.rawBody` is never populated and every `PUT /media/:id/content` fails
  // as an empty upload. Register one for the §8.2 mime families; the per-kind
  // caps in MediaService still gate the real size (limit here is headroom).
  app.useBodyParser('raw', {
    type: [
      'image/*',
      'audio/*',
      'video/*',
      'application/octet-stream',
      'application/pdf',
      'application/zip',
      'application/msword',
      'application/vnd.*',
      'text/plain',
    ],
    limit: '30mb',
  });

  app.enableCors({
    origin: origins.length ? origins : false,
    credentials: true,
    exposedHeaders: ['Authorization', 'Idempotency-Key', 'If-Match', 'X-Request-Id', 'Retry-After'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'If-Match', 'X-Request-Id'],
  });

  // §10.1 security headers + no-store on every response (auth/admin surfaces).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // §2 snake_case bodies mirror the DTO props 1:1; unknown keys are stripped,
  // required/primitive checks throw → the filter renders `validation_failed`.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // OpenAPI served from the same decorators the DTOs carry (§1 @nestjs/swagger).
  const swagger = new DocumentBuilder()
    .setTitle('THUIE API')
    .setVersion('1.0')
    .setDescription('Campus alumni info-exchange platform — see ../BACKEND.md')
    .addBearerAuth()
    .addServer(`/${prefix}`)
    .build();
  SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swagger));

  await app.listen(port, '0.0.0.0');
  Logger.log(`THUIE API ready on :${port}/${prefix} (docs at /${prefix}/docs)`, 'Bootstrap');
}

void bootstrap();
