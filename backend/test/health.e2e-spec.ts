import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { AppConfigService } from '@/config/app-config.service';
import { buildValidationPipe } from '@/common/http/validation';
import { AllExceptionsFilter } from '@/common/http/all-exceptions.filter';
import { dropDatabase, provisionDb, requireInfraOrSkip } from './support/e2e-infra';

/**
 * Bosqich 1 "Definition of Done":
 *   real Postgres + Redis  → /health/ready 200, /docs ochiladi, 404 = { code, requestId }.
 *
 * Infra — CI'da GitHub Actions service konteynerlari, lokal'da
 * `E2E_SUPERUSER_URL` / `E2E_REDIS_URL`. Ulanish URL'lari
 * `test/jest-e2e.setup.ts` da (import'dan OLDIN) o'rnatiladi — `@nestjs/config`
 * ularni import vaqtida snapshot qiladi. `health_e2e` DB'sini `bobododa_app`
 * roli bilan ishlatadi (F1 boot-tekshiruvi — happy path shu yerda sinaladi;
 * fail-closed yo'l `db-role-assertion.e2e-spec.ts` da). Postgres yetib
 * bo'lmasa (va `CI_REQUIRE_E2E` yo'q) testlar o'tkazib yuboriladi.
 */
describe('Health (e2e, real Postgres + Redis)', () => {
  let app: INestApplication | undefined;
  let reachable = false;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('health.e2e');
    if (!reachable) return;

    await provisionDb('health_e2e'); // rollar + GRANT/REVOKE + migrate (bobododa_migrator)
    // process.env.DATABASE_URL allaqachon bobododa_app@.../health_e2e (setup.ts)

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(AppConfigService);
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/live', 'health/ready', 'docs', 'docs-json'],
    });
    app.useGlobalPipes(buildValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    if (config.swaggerEnabled) {
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Bobo&Doda API').setVersion('0.1.0').build(),
      );
      SwaggerModule.setup('docs', app, doc, { jsonDocumentUrl: 'docs-json' });
    }
    await app.init(); // F1 (assertDbRoleHardening) shu yerda ishlaydi — bobododa_app → happy path
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (reachable) await dropDatabase('health_e2e');
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  t('GET /health/live → 200 ok', async () => {
    const res = await request(app!.getHttpServer()).get('/health/live').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  t('GET /health/ready → 200, db va redis true', async () => {
    const res = await request(app!.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: true, redis: true });
  });

  t('GET /docs → 200 (Swagger UI)', async () => {
    await request(app!.getHttpServer()).get('/docs').expect(200);
  });

  t('GET /docs-json → 200, OpenAPI hujjati /health yo’llarini o’z ichiga oladi', async () => {
    const res = await request(app!.getHttpServer()).get('/docs-json').expect(200);
    expect(res.body.paths).toHaveProperty('/health/ready');
    expect(res.body.info.title).toBe('Bobo&Doda API');
  });

  t('noma’lum marshrut → 404 { code: "NOT_FOUND", requestId }', async () => {
    const res = await request(app!.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
