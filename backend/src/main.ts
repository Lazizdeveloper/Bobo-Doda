import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { buildValidationPipe } from './common/http/validation';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  // `rawBody: true` — Bosqich 5, bo'lim 16: `req.rawBody` (Buffer) barcha
  // marshrutlar uchun to'ldiriladi, `req.body` (parsed JSON) BILAN BIRGA.
  // Webhook signature RAW baytlar ustida tekshiriladi — parsed JSON'ni
  // qayta `JSON.stringify` qilish signature'ni buzishi mumkin edi (masalan
  // kalit tartibi/probel farqi).
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  // Pino logger — Nest'ning default logger'i o'rniga.
  app.useLogger(app.get(PinoLogger));

  const config = app.get(AppConfigService);

  // Xavfsizlik header'lari (X-Frame-Options, HSTS va h.k.).
  app.use(helmet());
  // Refresh token cookie'lari (`auth`/`staff-auth`) — httpOnly, `req.cookies`
  // orqali o'qiladi.
  app.use(cookieParser());

  // `api/v1` prefiksi — health va docs undan tashqarida.
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'health/ready', 'docs', 'docs-json'],
  });

  // Global: ValidationPipe (whitelist + forbidNonWhitelisted + transform) +
  // ExceptionFilter (APP_FILTER'da ham bor; bu yerda ham — filtr har ikki
  // holatda ishlashi kafolatlansin).
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });

  app.enableShutdownHooks();

  // Swagger — production'da ataylab yoqilmaydi.
  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Bobo&Doda API')
      .setDescription(
        "Markaziy Osiyo freelance marketplace — milestone escrow, double-entry ledger. " +
          'Frontend `lib/api` chegarasini qoplaydi.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    document.openapi = '3.1.0';
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(config.port);

  const logger = new NestLogger('Bootstrap');
  logger.log(`Bobo&Doda backend tayyor — http://localhost:${config.port}`);
  logger.log(`Health:  http://localhost:${config.port}/health/ready`);
  if (config.swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${config.port}/docs`);
  }
}

void bootstrap();
