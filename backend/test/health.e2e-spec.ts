import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '@/app.module';
import { AppConfigService } from '@/config/app-config.service';
import { buildValidationPipe } from '@/common/http/validation';
import { AllExceptionsFilter } from '@/common/http/all-exceptions.filter';
import { E2E_SUPERUSER_URL, pgReachable, recreateDatabase } from './support/e2e-infra';

/**
 * Bosqich 1 "Definition of Done":
 *   real Postgres + Redis  → /health/ready 200, /docs ochiladi, 404 = { code, requestId }.
 *
 * Infra — CI'da GitHub Actions service konteynerlari, lokal'da
 * `E2E_SUPERUSER_URL` / `E2E_REDIS_URL` (docker compose yoki throwaway klaster).
 * Ulanish URL'lari `test/jest-e2e.setup.ts` da (import'dan OLDIN) o'rnatiladi —
 * `@nestjs/config` ularni import vaqtida snapshot qiladi. Bu suite faqat
 * `health_e2e` DB'sini yaratadi va migratsiya qiladi. Postgres yetib bo'lmasa
 * testlar o'tkazib yuboriladi.
 */
describe('Health (e2e, real Postgres + Redis)', () => {
  let app: INestApplication | undefined;
  let reachable = false;

  beforeAll(async () => {
    reachable = await pgReachable();
    if (!reachable) {
      process.stderr.write(
        `[health.e2e] Postgres yetib bo'lmadi (${E2E_SUPERUSER_URL}) — suite o'tkazib yuborildi\n`,
      );
      return;
    }

    await recreateDatabase('health_e2e');
    const dbUrl = process.env.DATABASE_URL as string; // setup.ts → .../health_e2e

    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: `${__dirname}/..`,
      env: { ...process.env, DATABASE_URL: dbUrl, DATABASE_MIGRATION_URL: dbUrl },
      stdio: 'inherit',
    });

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
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (reachable) {
      const admin = new PrismaClient({ datasourceUrl: E2E_SUPERUSER_URL });
      await admin
        .$executeRawUnsafe(`DROP DATABASE IF EXISTS "health_e2e" WITH (FORCE)`)
        .catch(() => undefined);
      await admin.$disconnect();
    }
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
