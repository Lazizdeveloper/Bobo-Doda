/**
 * e2e spec'lari `AppModule` ni FAYL BOSHIDA import qiladi. `@nestjs/config`
 * `forRoot` — `validate: validateEnv` bilan — import vaqtidayoq `process.env`
 * ni O'QIYDI va SNAPSHOT qiladi (`cache: true`). Shuning uchun ulanish
 * URL'lari `beforeAll` da emas, SHU YERDA (spec import'idan oldin) o'rnatilishi
 * SHART — aks holda RedisService/PrismaService noto'g'ri (dummy) manzilga
 * ulanishga urinadi va boot osilib qoladi.
 *
 * Manzillar deterministik: CI'da service konteynerlar (`localhost:5432/6379`),
 * lokal'da `E2E_SUPERUSER_URL` / `E2E_REDIS_URL`. `health.e2e-spec` va
 * `db-role-assertion.e2e-spec` `health_e2e` DB'sini **`bobododa_app`** roli
 * bilan ishlatadi (F1 tekshiruvi shuni talab qiladi) — uni `beforeAll`
 * `provisionDb('health_e2e')` bilan yaratadi/rollarni sozlaydi.
 */
const SUPERUSER =
  process.env.E2E_SUPERUSER_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const host = new URL(SUPERUSER.replace(/^[a-z]+:\/\//i, 'http://')).host;

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.SWAGGER_ENABLED = 'true';
process.env.DB_ROLE_ASSERTION = 'on';
process.env.DATABASE_URL = `postgresql://bobododa_app:app@${host}/health_e2e?schema=public`;
process.env.DATABASE_MIGRATION_URL = `postgresql://bobododa_migrator:migrator@${host}/health_e2e?schema=public`;
process.env.REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6379';
