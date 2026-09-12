import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { dropDatabase, provisionDb, requireInfraOrSkip } from './support/e2e-infra';

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
 * Infra — CI service konteynerlari / lokal `E2E_SUPERUSER_URL`. Yetib
 * bo'lmasa (va `CI_REQUIRE_E2E` yo'q) suite o'tkazib yuboriladi (F2).
 * Docker'siz ekvivalent isbot: `scripts/prove-append-only.sh`.
 */
const DB = 'roles_e2e';

describe('DB rollari — append-only majburlash (e2e, real Postgres 16)', () => {
  let reachable = false;
  let appDb: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('db-roles.e2e');
    if (!reachable) return;

    const { appUrl } = await provisionDb(DB);
    appDb = new PrismaClient({ datasourceUrl: appUrl });
  }, 120_000);

  afterAll(async () => {
    await appDb?.$disconnect();
    if (reachable) await dropDatabase(DB);
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

  // ── Bosqich 6 — ledger append-only + DB-darajasidagi invariantlar ───────

  t('bobododa_app ledger_accounts/ledger_transactions/ledger_entries ga INSERT qila oladi (balanslangan)', async () => {
    const txId = crypto.randomUUID();
    await appDb!.$executeRawUnsafe(
      `INSERT INTO ledger_transactions (id, type, currency, "sourceId") VALUES ('${txId}'::uuid, 'PAYMENT_FUNDING', 'UZS', 'db-roles-proof-1')`,
    );
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO ledger_entries (id, "transactionId", "accountId", amount, currency) VALUES
           (gen_random_uuid(), '${txId}'::uuid, '00000000-0000-7000-8000-000000000001'::uuid, -1000, 'UZS'),
           (gen_random_uuid(), '${txId}'::uuid, '00000000-0000-7000-8000-000000000002'::uuid, 1000, 'UZS')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);
  });

  t('bobododa_app ledger_entries ni UPDATE qila OLMAYDI — permission denied', async () => {
    await expect(appDb!.$executeRawUnsafe(`UPDATE ledger_entries SET amount = 999`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  t('bobododa_app ledger_entries dan DELETE qila OLMAYDI — permission denied', async () => {
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM ledger_entries`)).rejects.toThrow(/permission denied/i);
  });

  t('bobododa_app ledger_transactions ni UPDATE qila OLMAYDI — permission denied', async () => {
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE ledger_transactions SET description = 'tampered'`),
    ).rejects.toThrow(/permission denied/i);
  });

  t('bobododa_app ledger_accounts ni UPDATE qila OLMAYDI — permission denied', async () => {
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE ledger_accounts SET currency = 'USD'`),
    ).rejects.toThrow(/permission denied/i);
  });

  t('DB darajasida: balanslanmagan journal COMMIT vaqtida rad etiladi (deferred trigger)', async () => {
    const txId = crypto.randomUUID();
    await expect(
      appDb!.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO ledger_transactions (id, type, currency, "sourceId") VALUES ('${txId}'::uuid, 'PAYMENT_FUNDING', 'UZS', 'db-roles-proof-unbalanced')`,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO ledger_entries (id, "transactionId", "accountId", amount, currency) VALUES
             (gen_random_uuid(), '${txId}'::uuid, '00000000-0000-7000-8000-000000000001'::uuid, -1000, 'UZS')`,
        );
      }),
    ).rejects.toThrow(/balanslanmagan/i);
  });

  t('DB darajasida: cross-currency entry darhol rad etiladi', async () => {
    const txId = crypto.randomUUID();
    await expect(
      appDb!.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO ledger_transactions (id, type, currency, "sourceId") VALUES ('${txId}'::uuid, 'PAYMENT_FUNDING', 'UZS', 'db-roles-proof-currency')`,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO ledger_entries (id, "transactionId", "accountId", amount, currency) VALUES
             (gen_random_uuid(), '${txId}'::uuid, '00000000-0000-7000-8000-000000000001'::uuid, -1000, 'USD')`,
        );
      }),
    ).rejects.toThrow(/valyuta mos emas/i);
  });

  // ── Bosqich 7 — refund/payout append-only + enum-split migratsiya isboti ──

  t('Bosqich 7 — REFUND_CLEARING platforma hisobi eager bootstrap qilingan', async () => {
    const rows = await appDb!.$queryRawUnsafe<{ type: string; ownerType: string }[]>(
      `SELECT type, "ownerType" FROM ledger_accounts WHERE id = '00000000-0000-7000-8000-000000000003'::uuid`,
    );
    expect(rows).toEqual([{ type: 'REFUND_CLEARING', ownerType: 'PLATFORM' }]);
  });

  t('bobododa_app refund_provider_events/payout_provider_events ga INSERT qila oladi', async () => {
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO refund_provider_events (id, provider, "providerEventId", "eventType", outcome)
         VALUES (gen_random_uuid(), 'TEST', 'db-roles-refund-evt-1', 'refund.succeeded', 'APPLIED')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO payout_provider_events (id, provider, "providerEventId", "eventType", outcome)
         VALUES (gen_random_uuid(), 'TEST', 'db-roles-payout-evt-1', 'payout.succeeded', 'APPLIED')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);
  });

  t('bobododa_app refund_provider_events ni UPDATE/DELETE qila OLMAYDI — permission denied', async () => {
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE refund_provider_events SET outcome = 'TAMPERED'`),
    ).rejects.toThrow(/permission denied/i);
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM refund_provider_events`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  t('bobododa_app payout_provider_events ni UPDATE/DELETE qila OLMAYDI — permission denied', async () => {
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE payout_provider_events SET outcome = 'TAMPERED'`),
    ).rejects.toThrow(/permission denied/i);
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM payout_provider_events`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  t('DB darajasida: REFUND/PAYOUT_RESERVATION/PAYOUT_RELEASE enum qiymatlari ishlatiladi (enum-split migratsiya muvaffaqiyatli)', async () => {
    // Bo'lim 73 — bu test aslida `provisionDb()` orqali FRESH DB'ga ikkala
    // migratsiya (`stage7_ledger_enum_values` + `stage7_refund_payout`)
    // KETMA-KET qo'llanganini isbotlaydi: agar ular bitta tranzaksiyada
    // birlashtirilgan bo'lganida edi, `prisma migrate deploy`ning o'zi
    // (yuqoridagi `beforeAll`da) allaqachon xato bilan yiqilardi.
    const txId = crypto.randomUUID();
    await appDb!.$executeRawUnsafe(
      `INSERT INTO ledger_transactions (id, type, currency, "sourceId") VALUES ('${txId}'::uuid, 'REFUND', 'UZS', 'db-roles-proof-refund')`,
    );
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO ledger_entries (id, "transactionId", "accountId", amount, currency) VALUES
           (gen_random_uuid(), '${txId}'::uuid, '00000000-0000-7000-8000-000000000003'::uuid, 1000, 'UZS')`,
      ),
    ).rejects.toThrow(/balanslanmagan/i); // faqat 1 ta yozuv — ATAYLAB balanssiz, enum qiymati o'zi ishlaganini tekshiramiz
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
