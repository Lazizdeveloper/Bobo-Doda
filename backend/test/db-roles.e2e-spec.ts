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

  // ── Bosqich 8 — dispute append-only + enum-split migratsiya isboti ───────

  t('bobododa_app dispute_evidence/dispute_events ga INSERT qila oladi, lekin UPDATE/DELETE qila OLMAYDI', async () => {
    // To'liq FK zanjiri kerak (disputes.contractId/openedByUserId real FK) —
    // tipланган Prisma Client orqali (raw SQL'dan ancha ishonchli/qisqa).
    // `bobododa_app`ning bu jadvallarga TO'LIQ CRUD huquqi bor (append-only
    // RO'YXATIDA EMAS) — faqat `dispute_evidence`/`dispute_events` cheklangan.
    const sellerId = crypto.randomUUID();
    const buyerId = crypto.randomUUID();
    const categoryId = crypto.randomUUID();
    const serviceId = crypto.randomUUID();
    const contractId = crypto.randomUUID();
    const disputeId = crypto.randomUUID();

    await appDb!.user.create({
      data: { id: sellerId, phone: `+99890${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`, fullName: 'Seller T' },
    });
    await appDb!.user.create({
      data: { id: buyerId, phone: `+99890${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`, fullName: 'Buyer T' },
    });
    await appDb!.category.create({
      data: { id: categoryId, slug: `db-roles-cat-${categoryId.slice(0, 8)}`, nameUz: 'T', nameRu: 'T', nameEn: 'T' },
    });
    await appDb!.service.create({
      data: {
        id: serviceId,
        sellerId,
        categoryId,
        title: 'T',
        description: 'T'.repeat(20),
        price: 100_000_00n,
        deliveryDays: 3,
        status: 'ACTIVE',
      },
    });
    await appDb!.contract.create({
      data: {
        id: contractId,
        buyerId,
        sellerId,
        serviceId,
        serviceTitleSnapshot: 'T',
        serviceDescriptionSnapshot: 'T',
        categoryNameSnapshot: 'T',
        sellerDisplayNameSnapshot: 'T',
        agreedAmount: 100_000_00n,
        platformFeeRateBpsSnapshot: 500,
        platformFeeAmountSnapshot: 5_000_00n,
        deadline: new Date(Date.now() + 86_400_000),
        status: 'ACTIVE',
      },
    });
    await appDb!.dispute.create({
      data: {
        id: disputeId,
        contractId,
        openedByUserId: buyerId,
        reason: 'QUALITY',
        description: 'db-roles append-only proof',
        preSettlement: true,
        disputedAmount: 100_000_00n,
        heldAmount: 100_000_00n,
        currency: 'UZS',
      },
    });

    const evidenceId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO dispute_evidence (id, "disputeId", type, text) VALUES ('${evidenceId}'::uuid, '${disputeId}'::uuid, 'TEXT', 'proof')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO dispute_events (id, "disputeId", type, "actorType", "actorName") VALUES ('${eventId}'::uuid, '${disputeId}'::uuid, 'OPENED', 'SYSTEM', 'test')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);

    await expect(appDb!.$executeRawUnsafe(`UPDATE dispute_evidence SET text = 'TAMPERED'`)).rejects.toThrow(
      /permission denied/i,
    );
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM dispute_evidence`)).rejects.toThrow(/permission denied/i);
    await expect(appDb!.$executeRawUnsafe(`UPDATE dispute_events SET type = 'TAMPERED'`)).rejects.toThrow(
      /permission denied/i,
    );
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM dispute_events`)).rejects.toThrow(/permission denied/i);

    // `disputes`ning O'ZI append-only RO'YXATIDA EMAS (status legitim
    // UPDATE bo'lishi kerak — OPEN→UNDER_REVIEW→RESOLVED) — shuni ham tasdiqlaymiz.
    await expect(
      appDb!.$executeRawUnsafe(`UPDATE disputes SET status = 'UNDER_REVIEW' WHERE id = '${disputeId}'::uuid`),
    ).resolves.toBe(1);
  });

  t('DB darajasida: DISPUTE_HOLD/DISPUTE_RESOLUTION/DISPUTE_HOLD_RELEASE enum qiymatlari ishlatiladi (enum-split migratsiya muvaffaqiyatli)', async () => {
    const txId = crypto.randomUUID();
    await appDb!.$executeRawUnsafe(
      `INSERT INTO ledger_transactions (id, type, currency, "sourceId") VALUES ('${txId}'::uuid, 'DISPUTE_RESOLUTION', 'UZS', 'db-roles-proof-dispute')`,
    );
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO ledger_entries (id, "transactionId", "accountId", amount, currency) VALUES
           (gen_random_uuid(), '${txId}'::uuid, '00000000-0000-7000-8000-000000000001'::uuid, 1000, 'UZS')`,
      ),
    ).rejects.toThrow(/balanslanmagan/i); // faqat 1 ta yozuv — ATAYLAB balanssiz, enum qiymati o'zi ishlaganini tekshiramiz
  });

  // ── Bosqich 9 — reconciliation_runs append-only, financial_anomalies mutable ──

  t('bobododa_app reconciliation_runs ga INSERT qila oladi, lekin UPDATE/DELETE qila OLMAYDI', async () => {
    const runId = crypto.randomUUID();
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO reconciliation_runs
           (id, "operationType", "operationId", provider, trigger, status, "observedLocalStatus", "startedAt", "completedAt")
         VALUES ('${runId}'::uuid, 'PAYMENT', 'db-roles-proof-op', 'TEST', 'AUTOMATIC', 'NO_CHANGE', 'PENDING', now(), now())`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);

    await expect(
      appDb!.$executeRawUnsafe(`UPDATE reconciliation_runs SET status = 'RECONCILED' WHERE id = '${runId}'::uuid`),
    ).rejects.toThrow(/permission denied/i);
    await expect(appDb!.$executeRawUnsafe(`DELETE FROM reconciliation_runs WHERE id = '${runId}'::uuid`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  t('bobododa_app financial_anomalies ga INSERT VA UPDATE qila oladi (ataylab mutable — staff acknowledge)', async () => {
    const anomalyId = crypto.randomUUID();
    await expect(
      appDb!.$executeRawUnsafe(
        `INSERT INTO financial_anomalies (id, code, severity, "entityType", "entityId", description)
         VALUES ('${anomalyId}'::uuid, 'DB_ROLES_PROOF', 'WARNING', 'TEST', 'db-roles-proof-entity', 'proof')`,
      ),
    ).resolves.toBeGreaterThanOrEqual(1);

    await expect(
      appDb!.$executeRawUnsafe(`UPDATE financial_anomalies SET "resolvedAt" = now() WHERE id = '${anomalyId}'::uuid`),
    ).resolves.toBe(1);
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
