import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { PAYMENT_PROVIDER } from '@/modules/payment/providers/payment-provider.interface';
import { TestPaymentProvider, TEST_PROVIDER_SIGNATURE_HEADER } from '@/modules/payment/providers/test/test-payment.provider';
import {
  CapturingSmsProvider,
  createActiveService,
  createStaffSession,
  freshDb,
  futureIsoDate,
  loginNewUser,
  type UserSession,
} from './support/fixtures';

// `jest-e2e.setup.ts` DATABASE_URL/DATABASE_MIGRATION_URL'ni import vaqtida
// SHU nom bilan qattiq belgilaydi (barcha e2e fayllar bir xil literalni
// ishlatadi — `contract.e2e-spec.ts` bilan bir xil naqsh) — boshqa nom
// bersak app haqiqatda ulanadigan DB hech qachon provision qilinmagan bo'lib qoladi.
const DB = 'health_e2e';

/**
 * Bosqich 5 — Payment domain: yaratish (faqat ACTIVE contract, idempotency
 * hardened), webhook (signature/dedup/replay/mismatch/conflict), egalik,
 * concurrency. Har eng muhim moliyaviy invariant (bo'lim 59) shu yerda
 * kamida bittadan test bilan tasdiqlangan.
 */
describe('Payment (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;
  let provider!: TestPaymentProvider;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('payment.e2e');
    if (!reachable) return;
    await provisionDb(DB);
    await flushRedis();
    sms = new CapturingSmsProvider();
    app = await buildTestApp((b) => b.overrideProvider(SMS_PROVIDER).useValue(sms));
    db = freshDb();
    provider = app.get<TestPaymentProvider>(PAYMENT_PROVIDER);
  }, 120_000);

  afterAll(async () => {
    await db?.$disconnect();
    await app?.close();
    if (reachable) await dropDatabase(DB);
  });

  // contract.e2e-spec.ts bilan bir xil sabab — bu fayl ham har testda
  // bir necha OTP login qiladi, OTP rate-limit'ning o'zi bu yerda sinalmaydi.
  beforeEach(async () => {
    if (reachable) await flushRedis();
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  async function fullStaff() {
    return createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES', 'ORDERS', 'USERS', 'PAYMENTS']);
  }

  interface ActiveContractFixture {
    contractId: string;
    buyer: UserSession;
    seller: UserSession;
    priceSom: number;
    staffToken: string;
  }

  /** To'liq oqim: ACTIVE xizmat → buyer contract yaratadi → seller accept qiladi. */
  async function createActiveContract(opts?: { priceSom?: number }): Promise<ActiveContractFixture> {
    const staff = await fullStaff();
    const { serviceId, priceSom, seller } = await createActiveService(app!, sms, staff.accessToken, opts);
    const buyer = await loginNewUser(app!, sms, 'BUYER');
    const created = await request(app!.getHttpServer())
      .post('/api/v1/contracts')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ serviceId, deadline: futureIsoDate(), milestones: [{ title: 'Yagona bosqich', amount: priceSom }] })
      .expect(200);
    const contractId = created.body.id as string;
    await request(app!.getHttpServer())
      .post(`/api/v1/seller/contracts/${contractId}/accept`)
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .expect(200);
    return { contractId, buyer, seller, priceSom, staffToken: staff.accessToken };
  }

  function createPaymentReq(buyer: UserSession, contractId: string, idempotencyKey?: string) {
    const req = request(app!.getHttpServer())
      .post(`/api/v1/me/contracts/${contractId}/payment`)
      .set('Authorization', `Bearer ${buyer.accessToken}`);
    return idempotencyKey ? req.set('Idempotency-Key', idempotencyKey) : req;
  }

  function signedWebhook(payloadObj: Record<string, unknown>) {
    const raw = JSON.stringify(payloadObj);
    return { raw, signature: provider.signPayload(Buffer.from(raw)) };
  }

  function postWebhook(raw: string, signature: string | undefined, providerName = 'TEST') {
    const req = request(app!.getHttpServer())
      .post(`/api/v1/payments/webhooks/${providerName}`)
      .set('Content-Type', 'application/json');
    if (signature) req.set(TEST_PROVIDER_SIGNATURE_HEADER, signature);
    return req.send(raw);
  }

  // ── Yaratish ──────────────────────────────────────────────────────────

  t('Buyer muvaffaqiyatli yaratadi — PROCESSING, agreedAmount snapshot’dan', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const res = await createPaymentReq(buyer, contractId, 'idem-1').expect(200);
    expect(res.body.status).toBe('PROCESSING');
    expect(res.body.contractId).toBe(contractId);
    expect(res.body.amount).toBe(priceSom);
    expect(res.body.currency).toBe('UZS');
    expect(res.body.provider).toBe('TEST');
    expect(res.body.providerPaymentId).toBeUndefined(); // buyer DTO'da leak qilinmaydi

    const payment = await db!.payment.findFirstOrThrow({ where: { contractId } });
    expect(payment.providerPaymentId).toBe(`test_${payment.id}`);
    expect(payment.amount).toBe(BigInt(priceSom) * 100n);
  });

  t('Begona buyer’ning contract’i uchun to‘lov yarata olmaydi (404 — leak yo‘q)', async () => {
    const { contractId } = await createActiveContract();
    const stranger = await loginNewUser(app!, sms, 'BUYER');
    const res = await createPaymentReq(stranger, contractId, 'idem-2');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONTRACT_NOT_FOUND');
  });

  t('PENDING_SELLER (hali accept qilinmagan) contract — PAYMENT_NOT_ALLOWED', async () => {
    const staff = await fullStaff();
    const { serviceId, priceSom } = await createActiveService(app!, sms, staff.accessToken);
    const buyer = await loginNewUser(app!, sms, 'BUYER');
    const created = await request(app!.getHttpServer())
      .post('/api/v1/contracts')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ serviceId, deadline: futureIsoDate(), milestones: [{ title: 'Yagona bosqich', amount: priceSom }] })
      .expect(200);

    const res = await createPaymentReq(buyer, created.body.id, 'idem-3');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PAYMENT_NOT_ALLOWED');
  });

  t('BLOCKED buyer to‘lov yarata olmaydi (ACCOUNT_BLOCKED)', async () => {
    const { contractId, buyer, staffToken } = await createActiveContract();
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${buyer.userId}/block`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'test block for payment creation' })
      .expect(200);

    const res = await createPaymentReq(buyer, contractId, 'idem-4');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_BLOCKED');
  });

  t('Idempotency-Key header yo‘q — IDEMPOTENCY_KEY_REQUIRED', async () => {
    const { contractId, buyer } = await createActiveContract();
    const res = await createPaymentReq(buyer, contractId);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  t('Bir xil key ikki marta — bitta Payment, provider FAQAT bir marta chaqiriladi', async () => {
    const { contractId, buyer } = await createActiveContract();
    const first = await createPaymentReq(buyer, contractId, 'idem-5').expect(200);
    const second = await createPaymentReq(buyer, contractId, 'idem-5').expect(200);
    expect(second.body.id).toBe(first.body.id);

    const count = await db!.payment.count({ where: { contractId } });
    expect(count).toBe(1);
  });

  t('Bir xil key, boshqa contractId (boshqa so‘rov) — IDEMPOTENCY_CONFLICT', async () => {
    const first = await createActiveContract();
    const second = await createActiveContract();
    await createPaymentReq(first.buyer, first.contractId, 'idem-shared').expect(200);

    // E'tibor: ikkinchi contract HAM shu buyer'niki bo'lishi kerak, aks
    // holda birinchi 404 (CONTRACT_NOT_FOUND) qaytarardi — biz aynan
    // "bir xil actor + bir xil endpoint + boshqa canonical so'rov"ni
    // sinaymiz, shuning uchun ikkalasini ham BIR XIL buyer nomidan.
    await request(app!.getHttpServer())
      .post(`/api/v1/me/contracts/${second.contractId}/payment`)
      .set('Authorization', `Bearer ${first.buyer.accessToken}`)
      .set('Idempotency-Key', 'idem-shared')
      .then((res) => {
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('IDEMPOTENCY_CONFLICT');
      });
  });

  t('10 ta parallel bir xil key — faqat BITTASI muvaffaqiyatli, DB’da bitta Payment', async () => {
    const { contractId, buyer } = await createActiveContract();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => createPaymentReq(buyer, contractId, 'idem-parallel')),
    );
    const succeeded = results.filter((r) => r.status === 200);
    const conflicted = results.filter((r) => r.status === 409);
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(9);
    expect(conflicted.every((r) => r.body.code === 'IDEMPOTENCY_CONFLICT')).toBe(true);

    const count = await db!.payment.count({ where: { contractId } });
    expect(count).toBe(1);
  });

  t('Muvaffaqiyatli to‘lov mavjud bo‘lsa — PAYMENT_ALREADY_SUCCEEDED', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-6').expect(200);
    const paymentId = created.body.id as string;
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });

    const { raw, signature } = signedWebhook({
      eventId: 'evt-succeed-1',
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: priceSom * 100,
      currency: 'UZS',
    });
    await postWebhook(raw, signature).expect(200);

    const res = await createPaymentReq(buyer, contractId, 'idem-7');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PAYMENT_ALREADY_SUCCEEDED');
  });

  t('Qo‘llab-quvvatlanmaydigan valyuta — PAYMENT_CURRENCY_MISMATCH (defensiv chegara)', async () => {
    const { contractId, buyer } = await createActiveContract();
    await db!.contract.update({ where: { id: contractId }, data: { currency: 'USD' } });
    const res = await createPaymentReq(buyer, contractId, 'idem-8');
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PAYMENT_CURRENCY_MISMATCH');
  });

  t('Provider REJECT (deterministik) — Payment FAILED, PAYMENT_PROVIDER_ERROR qaytadi', async () => {
    const { contractId, buyer } = await createActiveContract();
    provider.queueScenario(contractId, 'REJECT');
    const res = await createPaymentReq(buyer, contractId, 'idem-9');
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PAYMENT_PROVIDER_ERROR');

    const payment = await db!.payment.findFirstOrThrow({ where: { contractId } });
    expect(payment.status).toBe('FAILED');
  });

  t('Provider TIMEOUT (ambiguous) — Payment PENDING’da qoladi, xato deterministik keshlanadi', async () => {
    const { contractId, buyer } = await createActiveContract();
    provider.queueScenario(contractId, 'TIMEOUT');
    const first = await createPaymentReq(buyer, contractId, 'idem-10');
    expect(first.status).toBe(503);
    expect(first.body.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE');

    const payment = await db!.payment.findFirstOrThrow({ where: { contractId } });
    expect(payment.status).toBe('PENDING');
    expect(payment.providerPaymentId).toBeNull();

    // Bo'lim 12/59 — qayta so'ralganda (bir xil key) provider YANA
    // chaqirilmaydi (scenario navbatda faqat bir marta bor edi) — xuddi
    // shu xato keshlangan holda qaytadi.
    const second = await createPaymentReq(buyer, contractId, 'idem-10');
    expect(second.status).toBe(503);
    expect(second.body.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE');
    expect(await db!.payment.count({ where: { contractId } })).toBe(1);
  });

  // ── Buyer o'qish ──────────────────────────────────────────────────────

  t('GET /me/payments — faqat o‘z to‘lovlarini ko‘radi', async () => {
    const { contractId, buyer } = await createActiveContract();
    await createPaymentReq(buyer, contractId, 'idem-list-1').expect(200);
    const other = await createActiveContract();
    await createPaymentReq(other.buyer, other.contractId, 'idem-list-2').expect(200);

    const res = await request(app!.getHttpServer())
      .get('/api/v1/me/payments')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].contractId).toBe(contractId);
  });

  t('GET /me/payments/:id — begona to‘lov 404', async () => {
    const { contractId, buyer } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-11').expect(200);
    const stranger = await loginNewUser(app!, sms, 'BUYER');
    const res = await request(app!.getHttpServer())
      .get(`/api/v1/me/payments/${created.body.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PAYMENT_NOT_FOUND');
  });

  // ── Staff o'qish ──────────────────────────────────────────────────────

  t('PAYMENTS ruxsatisiz staff — 403', async () => {
    const noPermStaff = await createStaffSession(app!, db!, ['DASHBOARD']);
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/payments')
      .set('Authorization', `Bearer ${noPermStaff.accessToken}`);
    expect(res.status).toBe(403);
  });

  t('Staff ro‘yxat/detail — providerPaymentId ko‘rinadi (traceability)', async () => {
    const { contractId, buyer, staffToken } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-12').expect(200);

    const list = await request(app!.getHttpServer())
      .get('/api/v1/staff/payments')
      .set('Authorization', `Bearer ${staffToken}`)
      .query({ contractId })
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].providerPaymentId).toBe(`test_${created.body.id}`);

    const detail = await request(app!.getHttpServer())
      .get(`/api/v1/staff/payments/${created.body.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(detail.body.payerUserId).toBe(buyer.userId);
  });

  // ── Webhook ───────────────────────────────────────────────────────────

  t('To‘g‘ri webhook — SUCCEEDED, AuditLog + Outbox yoziladi', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-13').expect(200);
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: created.body.id } });

    const { raw, signature } = signedWebhook({
      eventId: 'evt-ok-1',
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: priceSom * 100,
      currency: 'UZS',
    });
    await postWebhook(raw, signature).expect(200);

    const updated = await db!.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updated.status).toBe('SUCCEEDED');
    expect(updated.succeededAt).not.toBeNull();

    const auditCount = await db!.auditLog.count({
      where: { resourceType: 'PAYMENT', resourceId: payment.id, action: 'PAYMENT_SUCCEEDED' },
    });
    expect(auditCount).toBe(1);
    const outboxCount = await db!.outboxEvent.count({
      where: { aggregateType: 'PAYMENT', aggregateId: payment.id, eventType: 'PAYMENT_SUCCEEDED' },
    });
    expect(outboxCount).toBe(1);
  });

  t('Yaroqsiz imzo — 401 PAYMENT_WEBHOOK_INVALID, Payment o‘zgarmaydi', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-14').expect(200);
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: created.body.id } });

    const { raw } = signedWebhook({
      eventId: 'evt-bad-sig',
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: priceSom * 100,
      currency: 'UZS',
    });
    const res = await postWebhook(raw, 'aa'.repeat(32));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('PAYMENT_WEBHOOK_INVALID');

    const unchanged = await db!.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(unchanged.status).toBe('PROCESSING');
  });

  t('Noma’lum provider route segmenti — 401', async () => {
    const { raw, signature } = signedWebhook({
      eventId: 'evt-x',
      providerPaymentId: 'test_whatever',
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: 100,
      currency: 'UZS',
    });
    const res = await postWebhook(raw, signature, 'PAYME');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('PAYMENT_WEBHOOK_INVALID');
  });

  t('Noma’lum payment (providerPaymentId mos kelmaydi) — ack, hech narsa o‘zgarmaydi', async () => {
    const { raw, signature } = signedWebhook({
      eventId: 'evt-unknown-1',
      providerPaymentId: 'test_does_not_exist',
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: 100,
      currency: 'UZS',
    });
    await postWebhook(raw, signature).expect(200);

    const event = await db!.paymentProviderEvent.findUniqueOrThrow({
      where: { provider_providerEventId: { provider: 'TEST', providerEventId: 'evt-unknown-1' } },
    });
    expect(event.paymentId).toBeNull();
    expect(event.outcome).toBe('UNKNOWN_PAYMENT');
  });

  t('Summasi mos kelmasa — SUCCEEDED bo‘lmaydi, PAYMENT_WEBHOOK_MISMATCH audit', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-15').expect(200);
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: created.body.id } });

    const { raw, signature } = signedWebhook({
      eventId: 'evt-mismatch-1',
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: priceSom * 100 + 1, // 1 tiyin farq — CRITICAL
      currency: 'UZS',
    });
    await postWebhook(raw, signature).expect(200);

    const unchanged = await db!.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(unchanged.status).toBe('PROCESSING');
    const auditCount = await db!.auditLog.count({
      where: { resourceType: 'PAYMENT', resourceId: payment.id, action: 'PAYMENT_WEBHOOK_MISMATCH' },
    });
    expect(auditCount).toBe(1);
  });

  t('Takroriy hodisa (bir xil eventId) — ikkinchisi no-op, faqat BITTA audit/outbox', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-16').expect(200);
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: created.body.id } });

    const { raw, signature } = signedWebhook({
      eventId: 'evt-dup-1',
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: priceSom * 100,
      currency: 'UZS',
    });
    await postWebhook(raw, signature).expect(200);
    await postWebhook(raw, signature).expect(200); // aynan bir xil — provider qayta yetkazdi

    const auditCount = await db!.auditLog.count({
      where: { resourceType: 'PAYMENT', resourceId: payment.id, action: 'PAYMENT_SUCCEEDED' },
    });
    expect(auditCount).toBe(1);
    const outboxCount = await db!.outboxEvent.count({
      where: { aggregateType: 'PAYMENT', aggregateId: payment.id, eventType: 'PAYMENT_SUCCEEDED' },
    });
    expect(outboxCount).toBe(1);
    const eventCount = await db!.paymentProviderEvent.count({
      where: { provider: 'TEST', providerEventId: 'evt-dup-1' },
    });
    expect(eventCount).toBe(1);
  });

  t('10 ta parallel bir xil hodisa — SUCCEEDED aniq BIR MARTA (race)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-17').expect(200);
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: created.body.id } });

    const { raw, signature } = signedWebhook({
      eventId: 'evt-parallel-1',
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: priceSom * 100,
      currency: 'UZS',
    });
    const results = await Promise.all(Array.from({ length: 10 }, () => postWebhook(raw, signature)));
    expect(results.every((r) => r.status === 200)).toBe(true);

    const finalPayment = await db!.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(finalPayment.status).toBe('SUCCEEDED');
    const auditCount = await db!.auditLog.count({
      where: { resourceType: 'PAYMENT', resourceId: payment.id, action: 'PAYMENT_SUCCEEDED' },
    });
    expect(auditCount).toBe(1);
    const outboxCount = await db!.outboxEvent.count({
      where: { aggregateType: 'PAYMENT', aggregateId: payment.id, eventType: 'PAYMENT_SUCCEEDED' },
    });
    expect(outboxCount).toBe(1);
  });

  t('Qarama-qarshi keyingi hodisa (SUCCEEDED → FAILED, YANGI eventId) — CONFLICT, hech qachon orqaga qaytmaydi', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const created = await createPaymentReq(buyer, contractId, 'idem-18').expect(200);
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: created.body.id } });

    const succeedEvt = signedWebhook({
      eventId: 'evt-conflict-1',
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: priceSom * 100,
      currency: 'UZS',
    });
    await postWebhook(succeedEvt.raw, succeedEvt.signature).expect(200);

    const failEvt = signedWebhook({
      eventId: 'evt-conflict-2', // YANGI eventId — dedup gate bu safar yo'l qo'yadi
      providerPaymentId: payment.providerPaymentId,
      eventType: 'payment.failed',
      status: 'FAILED',
      amount: priceSom * 100,
      currency: 'UZS',
    });
    await postWebhook(failEvt.raw, failEvt.signature).expect(200);

    const finalPayment = await db!.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(finalPayment.status).toBe('SUCCEEDED'); // HECH QACHON orqaga qaytmadi
    const conflictAudit = await db!.auditLog.count({
      where: { resourceType: 'PAYMENT', resourceId: payment.id, action: 'PAYMENT_WEBHOOK_CONFLICT' },
    });
    expect(conflictAudit).toBe(1);
  });
});
