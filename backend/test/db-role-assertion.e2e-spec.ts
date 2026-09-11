import { PrismaClient } from '@prisma/client';
import { assertDbRoleHardening, checkDbRoleHardening } from '@/infra/prisma/db-role-assertion';
import {
  bootCheck,
  dropDatabase,
  E2E_REDIS_URL,
  provisionDb,
  requireInfraOrSkip,
  type ProvisionedDb,
} from './support/e2e-infra';

/**
 * F1 "Definition of Done" — noto'g'ri rol bilan ilova KO'TARILMASLIGINI
 * (fail closed) ISBOTLAYDI, ikki darajada:
 *   1. To'g'ridan-to'g'ri funksiya (`checkDbRoleHardening` /
 *      `assertDbRoleHardening`) — happy path, fail-closed, bypass.
 *   2. Butun process (`scripts/boot-check.ts`, ALOHIDA node processida) —
 *      "app.init() haqiqatan rad etadi" da'vosi jest module-cache'ga emas,
 *      real boot'ga tayanadi.
 */
const DB = 'assert_e2e';

describe('F1 — DB rol/append-only boot tekshiruvi', () => {
  let reachable = false;
  let prov: ProvisionedDb | undefined;
  let appDb: PrismaClient | undefined;
  let suDb: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('db-role-assertion.e2e');
    if (!reachable) return;

    prov = await provisionDb(DB);
    appDb = new PrismaClient({ datasourceUrl: prov.appUrl });
    suDb = new PrismaClient({ datasourceUrl: prov.superuserUrl });
  }, 120_000);

  afterAll(async () => {
    await appDb?.$disconnect();
    await suDb?.$disconnect();
    if (reachable) await dropDatabase(DB);
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  // ── 1. To'g'ridan-to'g'ri funksiya ────────────────────────────────────────

  t('bobododa_app bilan tekshiruv O‘TADI (failures = [])', async () => {
    const r = await checkDbRoleHardening(appDb!);
    expect(r.currentUser).toBe('bobododa_app');
    expect(r.failures).toEqual([]);
    await expect(assertDbRoleHardening(appDb!, { enabled: true })).resolves.toBeUndefined();
  });

  t('superuser bilan tekshiruv YIQILADI — noto‘g‘ri rol (fail closed)', async () => {
    const r = await checkDbRoleHardening(suDb!);
    expect(r.currentUser).not.toBe('bobododa_app');
    expect(r.failures.length).toBeGreaterThan(0);
    expect(r.failures.join('\n')).toMatch(/current_user/);
    await expect(assertDbRoleHardening(suDb!, { enabled: true })).rejects.toThrow(
      /tekshiruvi \(F1\) YIQILDI/,
    );
  });

  t('DB_ROLE_ASSERTION=off → tekshiruv o‘tkazib yuboriladi (bypass, faqat dev)', async () => {
    await expect(assertDbRoleHardening(suDb!, { enabled: false })).resolves.toBeUndefined();
  });

  // ── 2. Haqiqiy boot, alohida process ──────────────────────────────────────

  t('bobododa_app bilan REAL boot MUVAFFAQIYATLI (F1 happy path, alohida process)', async () => {
    const res = bootCheck({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
      DB_ROLE_ASSERTION: 'on',
      DATABASE_URL: prov!.appUrl,
      DATABASE_MIGRATION_URL: prov!.migratorUrl,
      REDIS_URL: E2E_REDIS_URL,
    });
    expect(res.stdout).toContain('BOOT_OK');
    expect(res.code).toBe(0);
  });

  t('superuser DATABASE_URL bilan REAL boot KO‘TARILMAYDI (F1 fail closed, alohida process)', async () => {
    const res = bootCheck({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
      DB_ROLE_ASSERTION: 'on',
      DATABASE_URL: prov!.superuserUrl, // ← ataylab noto'g'ri rol
      DATABASE_MIGRATION_URL: prov!.migratorUrl,
      REDIS_URL: E2E_REDIS_URL,
    });
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/BOOT_FAILED.*tekshiruvi \(F1\) YIQILDI/s);
    expect(res.stderr).toMatch(/current_user/);
  });

  t('superuser + DB_ROLE_ASSERTION=off → REAL boot MUVAFFAQIYATLI (bypass, faqat dev)', async () => {
    const res = bootCheck({
      NODE_ENV: 'development',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
      DB_ROLE_ASSERTION: 'off',
      DATABASE_URL: prov!.superuserUrl,
      DATABASE_MIGRATION_URL: prov!.migratorUrl,
      REDIS_URL: E2E_REDIS_URL,
    });
    expect(res.stdout).toContain('BOOT_OK');
    expect(res.code).toBe(0);
  });

  t('production + DB_ROLE_ASSERTION=off → ENV VALIDATSIYASI boot BOSHLANISHIDAN OLDIN rad etadi', async () => {
    const res = bootCheck({
      NODE_ENV: 'production',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
      DB_ROLE_ASSERTION: 'off', // ← prod'da imkonsiz (env.schema.ts)
      DATABASE_URL: prov!.appUrl,
      DATABASE_MIGRATION_URL: prov!.migratorUrl,
      REDIS_URL: E2E_REDIS_URL,
    });
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/DB_ROLE_ASSERTION/);
  });
});
