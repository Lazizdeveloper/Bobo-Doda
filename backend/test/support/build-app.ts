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
  return app;
}
