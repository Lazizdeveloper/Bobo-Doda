import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { execFileSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

import { AppModule } from '@/app.module';
import { AppConfigService } from '@/config/app-config.service';
import { buildValidationPipe } from '@/common/http/validation';
import { AllExceptionsFilter } from '@/common/http/all-exceptions.filter';

/**
 * Bosqich 1 "Definition of Done" ni AVTOMATLASHTIRADI:
 *   docker compose up  → /health/ready 200, /docs ochiladi.
 * Bu yerda Testcontainers real Postgres 16 + Redis 7 ko'taradi, migratsiya
 * yuguradi, app boot bo'ladi va endpoint'lar tekshiriladi.
 *
 * Docker kerak. Docker yo'q bo'lsa test o'zini o'tkazib yuboradi (CI'da Docker
 * bor, u yerda majburiy).
 */
describe('Health (e2e, real Postgres + Redis)', () => {
  let pg: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;
  let app: INestApplication;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('bobododa')
      .withUsername('bobododa')
      .withPassword('bobododa')
      .start();
    redis = await new RedisContainer('redis:7-alpine').start();

    const databaseUrl = pg.getConnectionUri();
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    // Bu health testi rol ajratishni sinamaydi — migrator = superuser URI.
    // Rol-isbotli test: `test/db-roles.e2e-spec.ts`.
    process.env.DATABASE_MIGRATION_URL = databaseUrl;
    process.env.REDIS_URL = redis.getConnectionUrl();
    process.env.SWAGGER_ENABLED = 'true';
    process.env.LOG_LEVEL = 'silent';

    // Migratsiyani real DB ga qo'llaymiz (prisma migrate deploy — directUrl).
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: `${__dirname}/..`,
      env: { ...process.env, DATABASE_URL: databaseUrl, DATABASE_MIGRATION_URL: databaseUrl },
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
    // Swagger'ni test'da ham o'rnatamiz (/docs tekshiruvi uchun).
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    if (config.swaggerEnabled) {
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Bobo&Doda API').setVersion('0.1.0').build(),
      );
      SwaggerModule.setup('docs', app, doc, { jsonDocumentUrl: 'docs-json' });
    }
    await app.init();
  }, 180000);

  afterAll(async () => {
    await app?.close();
    await pg?.stop();
    await redis?.stop();
  });

  it('GET /health/live → 200 ok', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET /health/ready → 200, db va redis true', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: true, redis: true });
  });

  it('GET /docs → 200 (Swagger UI)', async () => {
    await request(app.getHttpServer()).get('/docs').expect(200);
  });

  it('GET /docs-json → 200, OpenAPI hujjati /health yo’llarini o’z ichiga oladi', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(res.body.paths).toHaveProperty('/health/ready');
    expect(res.body.info.title).toBe('Bobo&Doda API');
  });

  it('noma’lum marshrut → 404 { code: "NOT_FOUND", requestId }', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
