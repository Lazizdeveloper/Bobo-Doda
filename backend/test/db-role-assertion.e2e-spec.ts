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
 *
 * T1 "Definition of Done" — rol nomi ENV ORQALI (`DB_APP_ROLE`) sozlanishini
 * ISBOTLAYDI: sukut `bobododa_app`dan BUTUNLAY BOSHQA nom bilan (masalan
 * managed Postgres prefiks talab qilsa) migratsiya/F1 hech qanday kod
 * o'zgarishisiz ishlaydi (pastdagi alohida `describe` bloki).
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
    const r = await checkDbRoleHardening(appDb!, prov!.appRole);
    expect(r.currentUser).toBe(prov!.appRole);
    expect(r.failures).toEqual([]);
    await expect(
      assertDbRoleHardening(appDb!, { enabled: true, expectedRole: prov!.appRole }),
    ).resolves.toBeUndefined();
  });

  t('superuser bilan tekshiruv YIQILADI — noto‘g‘ri rol (fail closed)', async () => {
    const r = await checkDbRoleHardening(suDb!, prov!.appRole);
    expect(r.currentUser).not.toBe(prov!.appRole);
    expect(r.failures.length).toBeGreaterThan(0);
    expect(r.failures.join('\n')).toMatch(/current_user/);
    await expect(
      assertDbRoleHardening(suDb!, { enabled: true, expectedRole: prov!.appRole }),
    ).rejects.toThrow(/tekshiruvi \(F1\) YIQILDI/);
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
      DB_APP_ROLE: prov!.appRole,
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
      DB_APP_ROLE: prov!.appRole,
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

// ─────────────────────────────────────────────────────────────────────────────
// T1 — rol nomi env orqali sozlanadi: sukut "bobododa_app"/"bobododa_migrator"
// dan BUTUNLAY BOSHQA nomlar bilan (managed Postgres cheklovini taqlid qiladi)
// migratsiya/F1 hech qanday tahrirlanmasdan ishlaydi.
// ─────────────────────────────────────────────────────────────────────────────
describe('T1 — DB_APP_ROLE (sukutdan boshqa rol nomi)', () => {
  const DB_CUSTOM = 'assert_custom_role_e2e';
  const CUSTOM_APP_ROLE = 'acme_app_svc';
  const CUSTOM_MIGRATOR_ROLE = 'acme_migrator_svc';

  let reachable = false;
  let prov: ProvisionedDb | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('T1.db-role-assertion.e2e');
    if (!reachable) return;

    // Sukutdan BUTUNLAY BOSHQA nomlar — "bobododa" prefiksi ham yo'q, faqat
    // Postgres kvotalanmagan identifikator qoidasiga mos bo'lsa yetarli.
    prov = await provisionDb(DB_CUSTOM, {
      appRole: CUSTOM_APP_ROLE,
      migratorRole: CUSTOM_MIGRATOR_ROLE,
    });
  }, 120_000);

  afterAll(async () => {
    if (reachable) await dropDatabase(DB_CUSTOM);
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  t('append-only real DB’da CUSTOM rol nomi bilan ham majburlanadi', async () => {
    const appDb = new PrismaClient({ datasourceUrl: prov!.appUrl });
    try {
      const r = await checkDbRoleHardening(appDb, CUSTOM_APP_ROLE);
      expect(r.currentUser).toBe(CUSTOM_APP_ROLE);
      expect(r.failures).toEqual([]);

      await expect(
        appDb.$executeRawUnsafe(`UPDATE audit_logs SET action = 'TAMPERED'`),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await appDb.$disconnect();
    }
  });

  t('DB_APP_ROLE=acme_app_svc bilan REAL boot MUVAFFAQIYATLI', async () => {
    const res = bootCheck({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
      DB_ROLE_ASSERTION: 'on',
      DB_APP_ROLE: CUSTOM_APP_ROLE,
      DATABASE_URL: prov!.appUrl,
      DATABASE_MIGRATION_URL: prov!.migratorUrl,
      REDIS_URL: E2E_REDIS_URL,
    });
    expect(res.stdout).toContain('BOOT_OK');
    expect(res.code).toBe(0);
  });

  t('DB_APP_ROLE sukut ("bobododa_app") bilan — mos kelmagani uchun REAL boot KO‘TARILMAYDI', async () => {
    // `DATABASE_URL` haqiqatan CUSTOM_APP_ROLE bilan ulanadi (URL o'zgarmadi),
    // lekin DB_APP_ROLE beri sukutga qoldirildi — F1 mos kelmaslikni topishi
    // kerak: bu "DATABASE_URL to'g'ri, lekin DB_APP_ROLE noto'g'ri
    // sozlangan" degan real xato holatini taqlid qiladi.
    const res = bootCheck({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
      DB_ROLE_ASSERTION: 'on',
      // DB_APP_ROLE berilmagan → sukut "bobododa_app" ≠ CUSTOM_APP_ROLE.
      DATABASE_URL: prov!.appUrl,
      DATABASE_MIGRATION_URL: prov!.migratorUrl,
      REDIS_URL: E2E_REDIS_URL,
    });
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/current_user.*bobododa_app/s);
  });
});
