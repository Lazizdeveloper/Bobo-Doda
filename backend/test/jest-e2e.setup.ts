/**
 * e2e spec'lari `AppModule` ni FAYL BOSHIDA import qiladi. `@nestjs/config`
 * `forRoot` — `validate: validateEnv` bilan — import vaqtidayoq `process.env`
 * ni O'QIYDI va SNAPSHOT qiladi (`cache: true`). Shuning uchun ulanish
 * URL'lari `beforeAll` da emas, SHU YERDA (spec import'idan oldin) o'rnatilishi
 * SHART — aks holda RedisService/PrismaService noto'g'ri (dummy) manzilga
 * ulanishga urinadi va boot osilib qoladi.
 *
 * Manzillar deterministik: CI'da service konteynerlar (`localhost:5432/6379`),
 * lokal'da `E2E_SUPERUSER_URL` / `E2E_REDIS_URL`. `health.e2e-spec` `health_e2e`
 * DB'sini ishlatadi (uni beforeAll yaratadi).
 */
const SUPERUSER =
  process.env.E2E_SUPERUSER_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const HEALTH_DB_URL = SUPERUSER.replace(/\/[^/?]+(\?|$)/, '/health_e2e$1');

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.SWAGGER_ENABLED = 'true';
process.env.DATABASE_URL = HEALTH_DB_URL;
process.env.DATABASE_MIGRATION_URL = HEALTH_DB_URL;
process.env.REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6379';
