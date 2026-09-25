import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as NestLogger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { API_GLOBAL_PREFIX, API_GLOBAL_PREFIX_EXCLUDE } from './config/api-prefix';
import { buildValidationPipe } from './common/http/validation';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';
import { buildStaffAwareCorsDelegate } from './common/http/cors';

async function bootstrap(): Promise<void> {
  // `rawBody: true` — Bosqich 5, bo'lim 16: `req.rawBody` (Buffer) barcha
  // marshrutlar uchun to'ldiriladi, `req.body` (parsed JSON) BILAN BIRGA.
  // Webhook signature RAW baytlar ustida tekshiriladi — parsed JSON'ni
  // qayta `JSON.stringify` qilish signature'ni buzishi mumkin edi (masalan
  // kalit tartibi/probel farqi).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, rawBody: true });

  // Pino logger — Nest'ning default logger'i o'rniga.
  app.useLogger(app.get(PinoLogger));

  const config = app.get(AppConfigService);

  // Bosqich 12, bo'lim 38 — reverse proxy ortida `req.ip`/`X-Forwarded-For`
  // to'g'ri o'qilishi uchun (rate limiting, secure IP logging, provider IP
  // allowlist — bo'lim 5). Ko'r-ko'rona `true` EMAS: sukut `false`
  // ("false" → Express hech narsaga ishonmaydi), production'da RUNBOOK'da
  // ko'rsatilgan konkret qiymat (`TRUST_PROXY`) bilan sozlanadi.
  const trustProxy = config.trustProxy;
  if (trustProxy === 'true') app.set('trust proxy', true);
  else if (trustProxy !== 'false') {
    const asNumber = Number(trustProxy);
    app.set('trust proxy', Number.isInteger(asNumber) && trustProxy.trim() !== '' ? asNumber : trustProxy);
  }

  // Xavfsizlik header'lari (X-Frame-Options, HSTS va h.k.). HSTS faqat
  // haqiqiy HTTPS deployment orqasida mazmunli — reverse proxy/CDN TLS
  // terminatsiya qiladi (RUNBOOK production readiness bo'limi).
  app.use(helmet());
  // Refresh token cookie'lari (`auth`/`staff-auth`) — httpOnly, `req.cookies`
  // orqali o'qiladi.
  app.use(cookieParser());
  // Bosqich 12, bo'lim 40 — global so'rov tanasi chegarasi (DoS himoyasi).
  // Provider JSON-RPC payload'lari (Payme) doim kichik (bir necha KB) —
  // 1mb keng zaxira bilan yetarli. Fayl yuklash ALOHIDA oqim (bo'lim 78 —
  // hozircha backend'da yo'q), shuning uchun bu yerga ta'sir qilmaydi.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  // `api/v1` prefiksi — health va docs undan tashqarida. Konstanta
  // (`config/api-prefix.ts`) — `emit-openapi.ts` va `test/support/
  // build-app.ts` HAM shu bitta manbadan o'qiydi (bo'lim 25).
  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: API_GLOBAL_PREFIX_EXCLUDE,
  });

  // Global: ValidationPipe (whitelist + forbidNonWhitelisted + transform) +
  // ExceptionFilter (APP_FILTER'da ham bor; bu yerda ham — filtr har ikki
  // holatda ishlashi kafolatlansin).
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Bo'lim 3 (admin.bobododa.uz ko'chirish) — security audit topilmasi 3a:
  // yagona umumiy CORS ro'yxat staff sessiyasiga HECH QANDAY real
  // izolyatsiya bermas edi. `staff/*` prefiksli yo'llar endi ALOHIDA,
  // torroq ro'yxatdan (`STAFF_CORS_ORIGINS`) o'tadi — qurilish
  // `common/http/cors.ts`da (YAGONA MANBA, `test/support/build-app.ts`
  // ham shu funksiyadan foydalanadi — ikkinchi security ko'rib chiqishida
  // topilgan: qo'lda ikki marta yozilsa, ikkisi ajralib ketishi mumkin
  // edi va test nusxani, haqiqiy faylni emas, sinardi).
  app.enableCors(buildStaffAwareCorsDelegate(config, `/${API_GLOBAL_PREFIX}/staff`));

  // Bosqich 12, bo'lim 44 — aniq signallar (Nest'ning "barcha signal"
  // sukutiga ishonib qolmaymiz): SIGTERM (deployment platform normal
  // to'xtatish) va SIGINT (Ctrl+C, lokal). Har ikkalasi ham `onModuleDestroy`/
  // `onApplicationShutdown`ni ishga tushiradi — BullMQ `WorkerHost`lar
  // (Outbox/Reconciliation) va Prisma/Redis ulanishlari shu orqali toza
  // yopiladi (`@nestjs/bullmq` bilan avtomatik).
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);

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
