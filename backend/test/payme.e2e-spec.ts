import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { PAYMENT_PROVIDER } from '@/modules/payment/providers/payment-provider.interface';
import { PaymeProvider } from '@/modules/payment/providers/payme/payme.provider';
import { PAYME_MERCHANT_CONFIG, type PaymeMerchantConfig } from '@/modules/payment/providers/payme/payme-rpc.types';
import { CapturingSmsProvider, createActiveService, createStaffSession, freshDb, futureIsoDate, loginNewUser, type UserSession } from './support/fixtures';

const DB = 'health_e2e';

const PAYME_CONFIG: PaymeMerchantConfig = {
  merchantId: 'test-merchant-e2e',
  login: 'Paycom',
  key: 'test-payme-key-e2e',
  checkoutUrl: 'https://test.paycom.uz',
};

const BASIC_AUTH = `Basic ${Buffer.from(`${PAYME_CONFIG.login}:${PAYME_CONFIG.key}`, 'utf8').toString('base64')}`;

/**
 * Bosqich 12 — Payme Merchant API: JSON-RPC protokol kontrakti, auth,
 * concurrency, moliyaviy cancel xavfsizligi. `PAYMENT_PROVIDER`/`PAYME_
 * MERCHANT_CONFIG` DI darajasida override qilinadi (`fixtures.ts`dagi
 * `SMS_PROVIDER` bilan BIR XIL naqsh) — real env/`.env`ga TEGILMAYDI,
 * boshqa e2e fayllarga hech qanday ta'siri yo'q.
 */
describe('Payme Merchant API (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;
  let rpcId = 0;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('payme.e2e');
    if (!reachable) return;
    await provisionDb(DB);
    await flushRedis();
    sms = new CapturingSmsProvider();
    app = await buildTestApp((b) =>
      b
        .overrideProvider(SMS_PROVIDER)
        .useValue(sms)
        .overrideProvider(PAYME_MERCHANT_CONFIG)
        .useValue(PAYME_CONFIG)
        .overrideProvider(PAYMENT_PROVIDER)
        .useValue(new PaymeProvider({ merchantId: PAYME_CONFIG.merchantId, checkoutUrl: PAYME_CONFIG.checkoutUrl })),
    );
    db = freshDb();
  }, 120_000);

  afterAll(async () => {
    await db?.$disconnect();
    await app?.close();
    if (reachable) await dropDatabase(DB);
  });

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
    priceSom: number;
  }

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
    return { contractId, buyer, priceSom };
  }

  /** Checkout-init: Payment PENDING yaratadi, provider HTTP chaqiruvisiz (bo'lim 24). */
  async function createPendingPayment(buyer: UserSession, contractId: string, idemKey: string): Promise<{ paymentId: string; amountTiyin: bigint; checkoutUrl: string }> {
    const res = await request(app!.getHttpServer())
      .post(`/api/v1/me/contracts/${contractId}/payment`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .set('Idempotency-Key', idemKey)
      .expect(200);
    expect(res.body.status).toBe('PENDING');
    expect(typeof res.body.checkoutUrl).toBe('string');
    expect(res.body.checkoutUrl).toContain('test.paycom.uz');
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: res.body.id } });
    return { paymentId: payment.id, amountTiyin: payment.amount, checkoutUrl: res.body.checkoutUrl };
  }

  // `auth?: string | null` — `null` ANIQ ravishda "header yo'q" degani.
  // `undefined` (parametr butunlay berilmasa) — JS default-parametr
  // semantikasi bo'yicha `BASIC_AUTH`ga tushadi.
  function rpc(method: string, params: Record<string, unknown>, auth: string | null = BASIC_AUTH) {
    rpcId += 1;
    const req = request(app!.getHttpServer()).post('/api/v1/payments/payme').send({ method, params, id: rpcId });
    if (auth) req.set('Authorization', auth);
    return req;
  }

  // ── Auth (bo'lim 66) ─────────────────────────────────────────────────────

  t('Authorization header yo‘q — JSON-RPC error -32504, HTTP 200', async () => {
    const res = await rpc('CheckPerformTransaction', { amount: 1000, account: { payment_id: 'x' } }, null).expect(200);
    expect(res.body.error.code).toBe(-32504);
    expect(res.body.result).toBeUndefined();
  });

  t('Xato login/key — -32504', async () => {
    const wrong = `Basic ${Buffer.from('wrong:creds', 'utf8').toString('base64')}`;
    const res = await rpc('CheckPerformTransaction', { amount: 1000, account: { payment_id: 'x' } }, wrong).expect(200);
    expect(res.body.error.code).toBe(-32504);
  });

  t('To‘g‘ri auth — metod ishlaydi (auth qatlamidan o‘tadi)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-auth-1');
    const res = await rpc('CheckPerformTransaction', { amount: priceSom * 100, account: { payment_id: paymentId } }).expect(200);
    expect(res.body.result.allow).toBe(true);
  });

  t('Noma’lum RPC metod — -32601', async () => {
    const res = await rpc('SomeUnknownMethod', {}).expect(200);
    expect(res.body.error.code).toBe(-32601);
  });

  // ── CheckPerformTransaction (bo'lim 10/65) ──────────────────────────────

  t('CheckPerformTransaction — noto‘g‘ri summa — -31001', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-cp-1');
    const res = await rpc('CheckPerformTransaction', { amount: priceSom * 100 + 1, account: { payment_id: paymentId } }).expect(200);
    expect(res.body.error.code).toBe(-31001);
  });

  t('CheckPerformTransaction — noma’lum account — -31050', async () => {
    const res = await rpc('CheckPerformTransaction', { amount: 1000, account: { payment_id: '00000000-0000-7000-8000-000000000000' } }).expect(200);
    expect(res.body.error.code).toBe(-31050);
    expect(res.body.error.data).toBe('payment_id');
  });

  t('CheckPerformTransaction — to‘g‘ri summa/account — allow:true', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-cp-2');
    const res = await rpc('CheckPerformTransaction', { amount: priceSom * 100, account: { payment_id: paymentId } }).expect(200);
    expect(res.body.result).toEqual({ allow: true });
  });

  // ── CreateTransaction (bo'lim 12/13/65) ─────────────────────────────────

  t('CreateTransaction — muvaffaqiyatli — PaymeTransaction yaratiladi, Payment PROCESSING', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-ct-1');
    const paymeTxId = 'ptx-create-1';
    const res = await rpc('CreateTransaction', {
      id: paymeTxId,
      time: Date.now(),
      amount: priceSom * 100,
      account: { payment_id: paymentId },
    }).expect(200);
    expect(res.body.result.state).toBe(1);
    expect(res.body.result.transaction).toBe(paymentId);
    expect(typeof res.body.result.create_time).toBe('number');

    const payment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('PROCESSING');
    expect(payment.providerPaymentId).toBe(paymeTxId);

    const tx = await db!.paymeTransaction.findUniqueOrThrow({ where: { paymeTransactionId: paymeTxId } });
    expect(tx.state).toBe(1);
    expect(tx.paymentId).toBe(paymentId);
  });

  t('CreateTransaction — bir xil id ikkinchi marta (bir xil account/amount) — IDEMPOTENT, yangi qator yo‘q', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-ct-2');
    const params = { id: 'ptx-idem-1', time: Date.now(), amount: priceSom * 100, account: { payment_id: paymentId } };
    const first = await rpc('CreateTransaction', params).expect(200);
    const second = await rpc('CreateTransaction', params).expect(200);
    expect(second.body.result).toEqual(first.body.result);
    expect(await db!.paymeTransaction.count({ where: { paymentId } })).toBe(1);
  });

  t('CreateTransaction — bir xil id, BOSHQA account (payment_id) — -31008', async () => {
    // Bo'lim 12 — real dunyoda Payme retry HAR DOIM bir xil params bilan
    // qaytadi; "bir xil id, boshqa amount" aslida amount Payment.amount'ga
    // solishtirilib -31001 bilan ALLAQACHON to'xtatiladi (bir necha qadam
    // oldinroq) — shuning uchun bu yerda haqiqatan YETIB BO'LADIGAN holat:
    // bir xil `id`, lekin boshqa `account.payment_id` (masalan noto'g'ri
    // client implementatsiyasi ID'ni qayta ishlatgan).
    const first = await createActiveContract();
    const { paymentId: p1 } = await createPendingPayment(first.buyer, first.contractId, 'payme-ct-3a');
    const second = await createActiveContract({ priceSom: first.priceSom });
    const { paymentId: p2 } = await createPendingPayment(second.buyer, second.contractId, 'payme-ct-3b');

    await rpc('CreateTransaction', { id: 'ptx-mismatch-1', time: Date.now(), amount: first.priceSom * 100, account: { payment_id: p1 } }).expect(200);
    const res = await rpc('CreateTransaction', { id: 'ptx-mismatch-1', time: Date.now(), amount: first.priceSom * 100, account: { payment_id: p2 } }).expect(200);
    expect(res.body.error.code).toBe(-31008);
    expect(await db!.paymeTransaction.count({ where: { paymeTransactionId: 'ptx-mismatch-1' } })).toBe(1);
  });

  t('CreateTransaction — Payment uchun IKKINCHI (boshqa id) transaksiya — -31008 (invalid state)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-ct-4');
    await rpc('CreateTransaction', { id: 'ptx-first-1', time: Date.now(), amount: priceSom * 100, account: { payment_id: paymentId } }).expect(200);
    const res = await rpc('CreateTransaction', { id: 'ptx-second-1', time: Date.now(), amount: priceSom * 100, account: { payment_id: paymentId } }).expect(200);
    expect(res.body.error.code).toBe(-31008);
    expect(await db!.paymeTransaction.count({ where: { paymentId } })).toBe(1);
  });

  t('CreateTransaction — 10 ta PARALLEL bir xil id — DB’da aniq BITTA PaymeTransaction (concurrency, bo‘lim 13/67)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-ct-race');
    const params = { id: 'ptx-race-1', time: Date.now(), amount: priceSom * 100, account: { payment_id: paymentId } };
    const results = await Promise.all(Array.from({ length: 10 }, () => rpc('CreateTransaction', params)));
    expect(results.every((r) => r.status === 200 && r.body.result)).toBe(true);
    expect(await db!.paymeTransaction.count({ where: { paymentId } })).toBe(1);
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('PROCESSING');
  });

  // ── PerformTransaction (bo'lim 14/15/65/67) ─────────────────────────────

  async function createdTransaction(priceSom: number, paymentId: string, paymeTxId: string) {
    return rpc('CreateTransaction', { id: paymeTxId, time: Date.now(), amount: priceSom * 100, account: { payment_id: paymentId } }).expect(200);
  }

  t('PerformTransaction — muvaffaqiyatli — Payment SUCCEEDED, BITTA PAYMENT_FUNDING ledger', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-pt-1');
    const paymeTxId = 'ptx-perform-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);

    const res = await rpc('PerformTransaction', { id: paymeTxId }).expect(200);
    expect(res.body.result.state).toBe(2);
    expect(typeof res.body.result.perform_time).toBe('number');

    const payment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('SUCCEEDED');
    expect(await db!.ledgerTransaction.count({ where: { type: 'PAYMENT_FUNDING', sourceId: paymentId } })).toBe(1);
  });

  t('PerformTransaction — noma’lum id — -31003', async () => {
    const res = await rpc('PerformTransaction', { id: 'ptx-does-not-exist' }).expect(200);
    expect(res.body.error.code).toBe(-31003);
  });

  t('PerformTransaction — 10 ta PARALLEL bir xil id — Payment SUCCEEDED bir marta, BITTA ledger (bo‘lim 15/67)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-pt-race');
    const paymeTxId = 'ptx-perform-race-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);

    const results = await Promise.all(Array.from({ length: 10 }, () => rpc('PerformTransaction', { id: paymeTxId })));
    expect(results.every((r) => r.status === 200 && r.body.result.state === 2)).toBe(true);
    // Hammasi BIR XIL perform_time qaytarishi shart (idempotent, qayta ijro yo'q).
    const performTimes = new Set(results.map((r) => r.body.result.perform_time));
    expect(performTimes.size).toBe(1);

    const payment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('SUCCEEDED');
    expect(await db!.ledgerTransaction.count({ where: { type: 'PAYMENT_FUNDING', sourceId: paymentId } })).toBe(1);
    const auditCount = await db!.auditLog.count({ where: { resourceType: 'PAYMENT', resourceId: paymentId, action: 'PAYMENT_SUCCEEDED' } });
    expect(auditCount).toBe(1);
  });

  t('PerformTransaction takroriy (ketma-ket) — ikkinchisi ham 200, xuddi shu natija (idempotent)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-pt-dup');
    const paymeTxId = 'ptx-perform-dup-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);

    const first = await rpc('PerformTransaction', { id: paymeTxId }).expect(200);
    const second = await rpc('PerformTransaction', { id: paymeTxId }).expect(200);
    expect(second.body.result).toEqual(first.body.result);
    expect(await db!.ledgerTransaction.count({ where: { type: 'PAYMENT_FUNDING', sourceId: paymentId } })).toBe(1);
  });

  // ── CancelTransaction (bo'lim 16/17/18/65/68) ───────────────────────────

  t('CancelTransaction — hali performed bo‘lmagan (state=1) — xavfsiz, Payment CANCELLED', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-cn-1');
    const paymeTxId = 'ptx-cancel-before-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);

    const res = await rpc('CancelTransaction', { id: paymeTxId, reason: 3 }).expect(200);
    expect(res.body.result.state).toBe(-1);

    const payment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('CANCELLED');
    expect(await db!.ledgerTransaction.count({ where: { sourceId: paymentId } })).toBe(0);
  });

  t('CancelTransaction — ALLAQACHON performed (state=2) — REFUSED -31007, Payment/ledger O‘ZGARMAYDI (bo‘lim 16/18/68)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-cn-2');
    const paymeTxId = 'ptx-cancel-after-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);
    await rpc('PerformTransaction', { id: paymeTxId }).expect(200);

    const beforePayment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const beforeLedgerCount = await db!.ledgerTransaction.count({ where: { type: 'PAYMENT_FUNDING', sourceId: paymentId } });

    const res = await rpc('CancelTransaction', { id: paymeTxId, reason: 5 }).expect(200);
    expect(res.body.error.code).toBe(-31007);

    const afterPayment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(afterPayment.status).toBe('SUCCEEDED');
    expect(afterPayment.status).toBe(beforePayment.status);
    expect(afterPayment.succeededAt?.getTime()).toBe(beforePayment.succeededAt?.getTime());
    expect(await db!.ledgerTransaction.count({ where: { type: 'PAYMENT_FUNDING', sourceId: paymentId } })).toBe(beforeLedgerCount);

    const auditCount = await db!.auditLog.count({ where: { action: 'PAYME_CANCEL_AFTER_PERFORM_REFUSED', resourceId: paymentId } });
    expect(auditCount).toBe(1);
  });

  t('CancelTransaction — noma’lum id — -31003', async () => {
    const res = await rpc('CancelTransaction', { id: 'ptx-cancel-unknown', reason: 1 }).expect(200);
    expect(res.body.error.code).toBe(-31003);
  });

  t('CancelTransaction — takroriy Cancel (bir xil, state allaqachon -1) — idempotent, xuddi shu javob (bo‘lim 31/67)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-cn-3');
    const paymeTxId = 'ptx-cancel-dup-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);
    const first = await rpc('CancelTransaction', { id: paymeTxId, reason: 1 }).expect(200);
    const second = await rpc('CancelTransaction', { id: paymeTxId, reason: 1 }).expect(200);
    expect(second.body.result).toEqual(first.body.result);
  });

  t('CancelTransaction — Perform + Cancel RACE (parallel) — ikkalasi ham javob beradi, Payment’ning yakuniy holati izchil (bo‘lim 67)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-cn-race');
    const paymeTxId = 'ptx-cancel-race-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);

    const [performRes, cancelRes] = await Promise.all([
      rpc('PerformTransaction', { id: paymeTxId }),
      rpc('CancelTransaction', { id: paymeTxId, reason: 1 }),
    ]);
    expect(performRes.status).toBe(200);
    expect(cancelRes.status).toBe(200);

    // Race'ning natijasidan qat'i nazar (kim birinchi bo'lganiga qarab):
    // yo Payment SUCCEEDED (Perform g'olib, Cancel keyin -31007 bilan rad
    // etildi), yo CANCELLED (Cancel g'olib, Perform endi state=-1 bo'lgani
    // uchun -31008 bilan rad etiladi) — lekin IKKALASI BIRGA HECH QACHON
    // (financial safety invarianti).
    const payment = await db!.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(['SUCCEEDED', 'CANCELLED']).toContain(payment.status);
    const fundingCount = await db!.ledgerTransaction.count({ where: { type: 'PAYMENT_FUNDING', sourceId: paymentId } });
    expect(fundingCount).toBe(payment.status === 'SUCCEEDED' ? 1 : 0);
  });

  // ── CheckTransaction (bo'lim 20/65) ─────────────────────────────────────

  t('CheckTransaction — persistent snapshot, qayta hisoblamaydi', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId } = await createPendingPayment(buyer, contractId, 'payme-chk-1');
    const paymeTxId = 'ptx-check-1';
    await createdTransaction(priceSom, paymentId, paymeTxId);
    await rpc('PerformTransaction', { id: paymeTxId }).expect(200);

    const res = await rpc('CheckTransaction', { id: paymeTxId }).expect(200);
    expect(res.body.result.state).toBe(2);
    expect(res.body.result.transaction).toBe(paymentId);
    expect(typeof res.body.result.perform_time).toBe('number');
    expect(res.body.result.perform_time).toBeGreaterThan(0);
  });

  t('CheckTransaction — noma’lum id — -31003', async () => {
    const res = await rpc('CheckTransaction', { id: 'ptx-check-unknown' }).expect(200);
    expect(res.body.error.code).toBe(-31003);
  });

  // ── GetStatement (bo'lim 21/65) ─────────────────────────────────────────

  t('GetStatement — bo‘sh oraliq — bo‘sh ro‘yxat', async () => {
    const past = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const res = await rpc('GetStatement', { from: past - 1000, to: past }).expect(200);
    expect(res.body.result.transactions).toEqual([]);
  });

  t('GetStatement — oraliq + tartib (ascending, createTime bo‘yicha)', async () => {
    const { contractId, buyer, priceSom } = await createActiveContract();
    const { paymentId: p1 } = await createPendingPayment(buyer, contractId, 'payme-gs-1');
    await createdTransaction(priceSom, p1, 'ptx-statement-1');

    const { contractId: c2, buyer: b2 } = await createActiveContract();
    const { paymentId: p2 } = await createPendingPayment(b2, c2, 'payme-gs-2');
    await createdTransaction(priceSom, p2, 'ptx-statement-2');

    const from = Date.now() - 60_000;
    const to = Date.now() + 60_000;
    const res = await rpc('GetStatement', { from, to }).expect(200);
    const ids = (res.body.result.transactions as { id: string }[]).map((t2) => t2.id);
    expect(ids).toContain('ptx-statement-1');
    expect(ids).toContain('ptx-statement-2');
    const idx1 = ids.indexOf('ptx-statement-1');
    const idx2 = ids.indexOf('ptx-statement-2');
    expect(idx1).toBeLessThan(idx2); // ascending — birinchi yaratilgan birinchi keladi
  });

  // ── Financial regression — TEST provider’ga ta’sir qilmasligi tekshiruvi ─

  t('checkoutUrl faqat YARATISH javobida — keyingi GET’da yo‘q', async () => {
    const { contractId, buyer } = await createActiveContract();
    const created = await createPendingPayment(buyer, contractId, 'payme-checkout-once');
    const detail = await request(app!.getHttpServer())
      .get(`/api/v1/me/payments/${created.paymentId}`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .expect(200);
    expect(detail.body.checkoutUrl).toBeUndefined();
  });
});
