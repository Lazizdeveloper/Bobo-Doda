import { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { AppConfigService } from '@/config/app-config.service';
import { buildValidationPipe } from '@/common/http/validation';
import { AllExceptionsFilter } from '@/common/http/all-exceptions.filter';

/**
 * `main.ts`dagi bootstrap bilan BIR XIL qadamlar (global prefix, pipe,
 * filter, cookie-parser, Swagger) — e2e testlari haqiqiy ishlab chiqarish
 * konfiguratsiyasini sinaydi, qisqartirilgan versiyasini emas.
 *
 * `configure` — `Test.createTestingModule({imports:[AppModule]})`ga
 * qo'shimcha (masalan `.overrideProvider(...)`) qo'shish uchun ixtiyoriy
 * hook (auth e2e — `SMS_PROVIDER`ni tutib olish uchun ishlatadi).
 */
export async function buildTestApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configure) builder = configure(builder);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication();
  const config = app.get(AppConfigService);
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'health/ready', 'docs', 'docs-json'],
  });
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());

  if (config.swaggerEnabled) {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Bobo&Doda API').setVersion('0.1.0').build(),
    );
    SwaggerModule.setup('docs', app, doc, { jsonDocumentUrl: 'docs-json' });
  }

  await app.init();

  // Bosqich 23 — Node http.Server sukut `keepAliveTimeout` (5s): agar
  // BIR NECHTA testdan qolgan bo'sh (idle) keep-alive socket shu vaqt
  // ichida qayta ishlatilmasa, SERVER uni faol yopadi. Uzoq, ketma-ket
  // `--runInBand` fayl ichida (yoki 10x chinakam PARALLEL burst — masalan
  // `seller-onboarding.e2e-spec.ts`dagi "10 ta PARALLEL submit") mijoz
  // (supertest/Node Agent) socket'ni AYNAN shu yopilish daqiqasida qayta
  // ishlatishga urinishi mumkin — klassik `ECONNRESET` poyga holati (real
  // GitHub Actions runner'da kuzatilgan, real Postgres 16+Redis
  // integration job'ida). Bu FAQAT test transporti — production'da
  // `app.listen()` haqiqiy tarmoq ulanishlari bilan ishlaydi, bu yerdagi
  // qiymat production konfiguratsiyasiga ta'sir qilmaydi.
  const server = app.getHttpServer() as { keepAliveTimeout?: number; headersTimeout?: number };
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  return app;
}
