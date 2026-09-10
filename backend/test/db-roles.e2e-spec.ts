import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { E2E_SUPERUSER_URL, pgReachable, recreateDatabase } from './support/e2e-infra';

/**
 * A4 "Definition of Done" — append-only DB DARAJASIDA majburlanganini ISBOTLAYDI.
 *
 * Toza DB → superuser rollarni yaratadi → `bobododa_migrator` bilan
 * `prisma migrate deploy` → `bobododa_app` bilan:
 *   • audit_logs / outbox_events ga INSERT — ✅
 *   • audit_logs UPDATE/DELETE            — ❌ permission denied (42501)
 *   • outbox_events UPDATE payload/DELETE — ❌ permission denied
 *   • outbox_events UPDATE status         — ✅ (worker uchun ustun-GRANT)
 *   • A2 kengaytmalari o'rnatilgan
 *
 * Infra — CI service konteynerlari / lokal `docker compose` / nix throwaway.
 * Yetib bo'lmasa suite o'tkazib yuboriladi. Docker'siz ekvivalent isbot:
 * `scripts/prove-append-only.sh`.
 */
const DB = 'roles_e2e';

describe('DB rollari — append-only majburlash (e2e, real Postgres 16)', () => {
  let reachable = false;
  let appDb: PrismaClient | undefined;
  let suDb: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await pgReachable();
    if (!reachable) {
      process.stderr.write(`[db-roles.e2e] Postgres yetib bo'lmadi — suite o'tkazib yuborildi\n`);
      return;
    }

    const suUrl = await recreateDatabase(DB); // superuser @ roles_e2e
    const host = new URL(suUrl.replace('postgresql://', 'http://')).host;
    const migratorUrl = `postgresql://bobododa_migrator:migrator@${host}/${DB}?schema=public`;
    const appUrl = `postgresql://bobododa_app:app@${host}/${DB}?schema=public`;

    process.env.DATABASE_URL = appUrl;
    process.env.DATABASE_MIGRATION_URL = migratorUrl;

    // ── Rollar (superuser; prisma/sql/roles.sql ekvivalenti) ───────────────
    suDb = new PrismaClient({ datasourceUrl: suUrl });
    for (const stmt of [
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bobododa_migrator') THEN
           CREATE ROLE bobododa_migrator LOGIN PASSWORD 'migrator';
         END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bobododa_app') THEN
           CREATE ROLE bobododa_app LOGIN PASSWORD 'app';
         END IF;
       END $$;`,
      `GRANT CONNECT ON DATABASE "${DB}" TO bobododa_migrator, bobododa_app`,
      `GRANT CREATE ON DATABASE "${DB}" TO bobododa_migrator`,
      `GRANT CREATE, USAGE ON SCHEMA public TO bobododa_migrator`,
      `GRANT USAGE ON SCHEMA public TO bobododa_app`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE bobododa_migrator IN SCHEMA public
         GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bobododa_app`,
    ]) {
      await suDb.$executeRawUnsafe(stmt);
    }

    // ── Migratsiya — MIGRATOR roli bilan (directUrl) ───────────────────────
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: `${__dirname}/..`,
      env: { ...process.env, DATABASE_URL: appUrl, DATABASE_MIGRATION_URL: migratorUrl },
      stdio: 'inherit',
    });

    appDb = new PrismaClient({ datasourceUrl: appUrl });
  }, 180_000);

  afterAll(async () => {
    await appDb?.$disconnect();
    await suDb?.$disconnect();
    if (reachable) {
      const admin = new PrismaClient({ datasourceUrl: E2E_SUPERUSER_URL });
      await admin
        .$executeRawUnsafe(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`)
        .catch(() => undefined);
      await admin.$disconnect();
    }
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_MIGRATION_URL;
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  t('A2 — kengaytmalar migrator tomonidan o‘rnatilgan', async () => {
    const rows = await appDb!.$queryRawUnsafe<{ extname: string }[]>(
      `SELECT extname FROM pg_extension ORDER BY extname`,
    );
    const names = rows.map((r) => r.extname);
    expect(names).toEqual(expect.arrayContaining(['btree_gin', 'citext', 'pg_trgm', 'unaccent']));
  });

  t('bobododa_app audit_logs ga INSERT qila oladi', async () => {
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO audit_logs (id, "actorType", "actorName", action, "resourceType", "resourceId")
         VALUES (gen_random_uuid(), 'SYSTEM', 'test', 'A4_PROOF', 'test', 't1')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);
  });

  t('bobododa_app audit_logs ni UPDATE qila OLMAYDI — permission denied', async () => {
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE audit_logs SET action = 'TAMPERED'`),
    ).rejects.toThrow(/permission denied for (relation|table) "?audit_logs"?/i);
  });

  t('bobododa_app audit_logs dan DELETE qila OLMAYDI — permission denied', async () => {
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM audit_logs`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  t('bobododa_app outbox_events ga INSERT + status UPDATE qila oladi (worker)', async () => {
    await appDb!.$executeRawUnsafe(
      `INSERT INTO outbox_events (id, "aggregateType", "aggregateId", "eventType", payload)
       VALUES (gen_random_uuid(), 'Test', 'x1', 'test.created', '{}'::jsonb)`,
    );
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE outbox_events SET status = 'PROCESSING', attempts = 1`),
    ).resolves.toBeGreaterThanOrEqual(1);
  });

  t('bobododa_app outbox_events payload ni UPDATE qila OLMAYDI — permission denied', async () => {
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE outbox_events SET payload = '{"x":1}'::jsonb`),
    ).rejects.toThrow(/permission denied/i);
  });

  t('bobododa_app outbox_events dan DELETE qila OLMAYDI — permission denied', async () => {
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM outbox_events`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  t('bobododa_app oddiy jadvalni (users) to‘liq boshqara oladi', async () => {
    await appDb!.$executeRawUnsafe(
      `INSERT INTO users (id, phone, "passwordHash", "fullName", "updatedAt")
       VALUES (gen_random_uuid(), '+998900000000', 'h', 'T', now())`,
    );
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE users SET "fullName" = 'T2' WHERE phone = '+998900000000'`),
    ).resolves.toBe(1);
    await expect(
      appDb!.$executeRawUnsafe(`DELETE FROM users WHERE phone = '+998900000000'`),
    ).resolves.toBe(1);
  });
});
