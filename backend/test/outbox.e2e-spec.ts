import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Prisma, PrismaClient } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { OutboxWorkerService } from '@/modules/notification/outbox-worker.service';
import { TestSmsProvider } from './support/test-sms.provider';
import { createActiveService, createStaffSession, freshDb, futureIsoDate, loginNewUser, type UserSession } from './support/fixtures';

const DB = 'health_e2e';

/**
 * Bosqich 10 — Outbox worker (claim/deliver/finalize/retry/DLQ). Worker
 * scheduler'i (`OutboxSchedulerService`) `config.isTest`da RO'YXATDAN
 * O'TKAZILMAYDI (`outbox-scheduler.service.ts`) — testlar
 * `OutboxWorkerService`ni TO'G'RIDAN-TO'G'RI chaqiradi, shu bilan (a)
 * determinist bo'ladi va (b) boshqa BARCHA e2e fayllardagi OTP capture
 * (`sms.lastPhone`/`lastCode`) fon jarayoni bilan HECH QACHON to'qnashmaydi.
 */
describe('Outbox worker (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: TestSmsProvider;
  let db: PrismaClient | undefined;
  let worker!: OutboxWorkerService;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('outbox.e2e');
    if (!reachable) return;
    await provisionDb(DB);
    await flushRedis();
    sms = new TestSmsProvider();
    app = await buildTestApp((b) => b.overrideProvider(SMS_PROVIDER).useValue(sms));
    db = freshDb();
    worker = app.get(OutboxWorkerService);
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
    return createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES', 'ORDERS', 'USERS', 'PAYMENTS', 'SETTINGS']);
  }

  interface ContractFixture {
    contractId: string;
    buyer: UserSession;
    seller: UserSession;
    priceSom: number;
  }

  /** Haqiqiy CONTRACT qatori — recipient resolver'i buyerId/sellerId/title/amount'ni shundan o'qiydi. */
  async function createContract(priceSom = 900_000): Promise<ContractFixture> {
    const staff = await fullStaff();
    const { serviceId, seller } = await createActiveService(app!, sms, staff.accessToken, { priceSom });
    const buyer = await loginNewUser(app!, sms, 'BUYER');
    const created = await request(app!.getHttpServer())
      .post('/api/v1/contracts')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ serviceId, deadline: futureIsoDate(), milestones: [{ title: 'Yagona bosqich', amount: priceSom }] })
      .expect(200);
    return { contractId: created.body.id as string, buyer, seller, priceSom };
  }

  async function enqueueRaw(overrides: {
    eventType?: string;
    aggregateType?: string;
    aggregateId?: string;
    payload?: Record<string, unknown>;
    payloadVersion?: number;
  }): Promise<string> {
    const id = uuidv7();
    await db!.outboxEvent.create({
      data: {
        id,
        aggregateType: overrides.aggregateType ?? 'CONTRACT',
        aggregateId: overrides.aggregateId ?? uuidv7(),
        eventType: overrides.eventType ?? 'CONTRACT_CREATED',
        payload: (overrides.payload ?? {}) as Prisma.InputJsonValue,
        payloadVersion: overrides.payloadVersion ?? 1,
      },
    });
    return id;
  }

  // ── Asosiy claim → deliver → finalize sikli ────────────────────────────

  t('PENDING qator claim qilinadi va SUCCESS bo‘lsa SENT bo‘ladi, OutboxDeliveryAttempt yoziladi', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });

    const stats = await worker.runBatch();
    expect(stats.delivered).toBeGreaterThanOrEqual(1);

    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId }, include: { deliveryAttempts: true } });
    expect(event.status).toBe('SENT');
    expect(event.processedAt).not.toBeNull();
    expect(event.deliveryAttempts).toHaveLength(1);
    expect(event.deliveryAttempts[0]!.status).toBe('DELIVERED');
    expect(event.deliveryAttempts[0]!.channel).toBe('SMS');
  });

  t('Retryable failure — status PENDING ga qaytadi, availableAt kelajakka suriladi, attempts oshadi', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    sms.queueScenario(outboxId, 'RETRYABLE_FAILURE');

    const before = new Date();
    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('PENDING');
    expect(event.attempts).toBe(1);
    expect(event.availableAt.getTime()).toBeGreaterThan(before.getTime());
  });

  t('RATE_LIMITED — provider Retry-After signali eksponensial formuladan USTUVOR (bo‘lim 40)', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    sms.queueScenario(outboxId, 'RATE_LIMITED'); // TestSmsProvider: retryAfterSeconds=5

    const before = Date.now();
    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('PENDING');
    const delaySeconds = (event.availableAt.getTime() - before) / 1000;
    // Sukut backoff (30s+) DAN ANIQ FARQLI — provider'ning 5s Retry-After'i ishlatilgan.
    expect(delaySeconds).toBeGreaterThan(0);
    expect(delaySeconds).toBeLessThan(15);
  });

  t('Permanent failure — DARHOL DEAD (retry qilinmaydi)', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    sms.queueScenario(outboxId, 'PERMANENT_FAILURE');

    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('DEAD');
    expect(event.attempts).toBe(1);
  });

  t('Max attempts tugagach — DEAD (DLQ semantikasi, event yo‘qolmaydi)', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });

    // Sukut OUTBOX_MAX_ATTEMPTS=6 — har safar RETRYABLE, availableAt'ni
    // qo'lda "hozir" qilib qo'yamiz (backoff kutmasdan, bo'lim 44 — testlar tez).
    for (let i = 0; i < 6; i += 1) {
      sms.queueScenario(outboxId, 'RETRYABLE_FAILURE');
      await db!.outboxEvent.update({ where: { id: outboxId }, data: { availableAt: new Date() } });
      await worker.runBatch();
    }

    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('DEAD');
    expect(event.attempts).toBe(6);
    expect(event.lastErrorCode).toBe('MAX_ATTEMPTS_EXHAUSTED');
  });

  t('Provider timeout (istisno) — AMBIGUOUS, konservativ RETRYABLE deb ko‘riladi, mutatsiya yo‘qolmaydi', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    sms.queueScenario(outboxId, 'TIMEOUT');

    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('PENDING'); // DEAD ham, SENT ham EMAS — noaniqlik = qayta urinish
    expect(event.attempts).toBe(1);
  });

  // ── Claim xavfsizligi — multi-worker ────────────────────────────────────

  t('Stale PROCESSING (worker crash simulyatsiyasi) — boshqa claim qayta oladi', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });

    // "Crash" simulyatsiyasi: PROCESSING'ga o'tkazib, lease muddatini eskirtiramiz.
    await db!.outboxEvent.update({
      where: { id: outboxId },
      data: { status: 'PROCESSING', processingToken: uuidv7(), processingStartedAt: new Date(Date.now() - 999_000) },
    });

    const { rows } = await worker.claimBatch();
    expect(rows.some((r) => r.id === outboxId)).toBe(true);
  });

  t('2 ta PARALLEL claimBatch — bitta qatorni FAQAT BITTASI oladi (FOR UPDATE SKIP LOCKED)', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });

    const [a, b] = await Promise.all([worker.claimBatch(), worker.claimBatch()]);
    const gotA = a.rows.some((r) => r.id === outboxId);
    const gotB = b.rows.some((r) => r.id === outboxId);
    expect(gotA !== gotB).toBe(true); // aynan BITTASI
  });

  t('10 ta PARALLEL worker claim — har bir qator FAQAT BIR marta claim qilinadi', async () => {
    const { contractId } = await createContract();
    const ids = await Promise.all(Array.from({ length: 10 }, () => enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId })));

    const results = await Promise.all(Array.from({ length: 10 }, () => worker.claimBatch()));
    const claimedIds = results.flatMap((r) => r.rows.map((row) => row.id));
    const uniqueClaimed = new Set(claimedIds);
    expect(uniqueClaimed.size).toBe(claimedIds.length); // dublikat YO'Q
    expect(ids.every((id) => uniqueClaimed.has(id))).toBe(true); // barchasi claim qilingan
  });

  t('Kech qolgan stale worker (eski token) finalize qila OLMAYDI — yangi worker natijasini buzmaydi', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });

    // Boshqa (avvalgi testlardan qolgan) PENDING qatorlar HAM claim
    // qilinishi mumkin — shu SABABLI o'zimizning qatorimizni ANIQ ID
    // bo'yicha topamiz, array uzunligiga tayanmaymiz.
    const first = await worker.claimBatch();
    const firstOwnRow = first.rows.find((r) => r.id === outboxId);
    expect(firstOwnRow).toBeDefined();
    const staleToken = first.token;

    // Lease eskirdi deb hisoblaymiz — boshqa worker RECLAIM qiladi.
    await db!.outboxEvent.update({ where: { id: outboxId }, data: { processingStartedAt: new Date(Date.now() - 999_000) } });
    const second = await worker.claimBatch();
    const secondOwnRow = second.rows.find((r) => r.id === outboxId);
    expect(secondOwnRow).toBeDefined();
    sms.queueScenario(outboxId, 'SUCCESS');
    await worker.processOne(secondOwnRow!, second.token);

    const afterSecond = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(afterSecond.status).toBe('SENT');

    // Endi ESKI (stale) worker "kech" javob bilan qaytadi va o'zining eski
    // token'i bilan finalize qilishga urinadi — bu HECH NARSANI o'zgartirmasligi kerak.
    sms.queueScenario(outboxId, 'PERMANENT_FAILURE');
    await worker.processOne(firstOwnRow!, staleToken);

    const afterStale = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId }, include: { deliveryAttempts: true } });
    expect(afterStale.status).toBe('SENT'); // BUZILMADI
    expect(afterStale.deliveryAttempts).toHaveLength(1); // stale urinish YOZILMADI
  });

  // ── Payload/eventType validatsiyasi ─────────────────────────────────────

  t('Noma’lum eventType — DARHOL DEAD (UNSUPPORTED_EVENT, operator ko‘rishi kerak)', async () => {
    const outboxId = await enqueueRaw({ eventType: 'SOME_FUTURE_EVENT_NOT_YET_CODED' });
    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('DEAD');
    expect(event.lastErrorCode).toBe('UNSUPPORTED_EVENT');
  });

  t('Noma’lum payloadVersion — DARHOL DEAD (UNSUPPORTED_PAYLOAD_VERSION)', async () => {
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', payloadVersion: 99 });
    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('DEAD');
    expect(event.lastErrorCode).toBe('UNSUPPORTED_PAYLOAD_VERSION');
  });

  t('Aggregat topilmadi (o‘chirilgan/mavjud bo‘lmagan) — SKIPPED (RECIPIENT_MISSING), DEAD EMAS', async () => {
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: uuidv7() });
    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('SKIPPED');
    expect(event.lastErrorCode).toBe('RECIPIENT_MISSING');
  });

  t('Ataylab bildirishnoma mo‘ljallanmagan hodisa (PAYOUT_RESERVED) — SKIPPED (NO_NOTIFICATION_MAPPED)', async () => {
    const outboxId = await enqueueRaw({ eventType: 'PAYOUT_RESERVED', aggregateType: 'PAYOUT', aggregateId: uuidv7() });
    await worker.runBatch();
    const event = await db!.outboxEvent.findUniqueOrThrow({ where: { id: outboxId } });
    expect(event.status).toBe('SKIPPED');
    expect(event.lastErrorCode).toBe('NO_NOTIFICATION_MAPPED');
  });

  // ── Delivery idempotency (bo'lim 11/64) ─────────────────────────────────

  t('Har retry’da BIR XIL stable reference (`OutboxEvent.id`) provider’ga uzatiladi — yangi tasodifiy reference YARATILMAYDI', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    sms.queueScenario(outboxId, 'RETRYABLE_FAILURE');
    await worker.runBatch();
    await db!.outboxEvent.update({ where: { id: outboxId }, data: { availableAt: new Date() } });
    sms.queueScenario(outboxId, 'SUCCESS');
    await worker.runBatch();

    // `runBatch()` boshqa (avvalgi testlardan qolgan) PENDING qatorlarni
    // ham qayta ishlashi mumkin — shu SABABLI ro'yxatni to'liq emas,
    // FAQAT o'zimizning `outboxId`ga oid yozuvlarni sanab tekshiramiz:
    // muvaffaqiyatsiz (birinchi) urinish umuman ro'yxatga TUSHMAYDI,
    // muvaffaqiyatli (ikkinchi) urinish ANIQ BIR MARTA, bir xil kalit bilan.
    const ownReferences = sms.sentReferences.filter((reference) => reference === outboxId);
    expect(ownReferences).toEqual([outboxId]);
  });

  // ── Bounded batch (bo'lim 38) ────────────────────────────────────────────

  t('claimBatch — OUTBOX_BATCH_SIZE dan ko‘p qatorni bir vaqtda olmaydi', async () => {
    const { contractId } = await createContract();
    await Promise.all(Array.from({ length: 5 }, () => enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId })));
    const { rows } = await worker.claimBatch();
    expect(rows.length).toBeLessThanOrEqual(50); // sukut OUTBOX_BATCH_SIZE=50 — bu yerda shunchaki chegaralanganini isbotlaymiz
  });

  // ── Staff HTTP endpoints ────────────────────────────────────────────────

  t('SETTINGS huquqisiz staff — 403', async () => {
    const limited = await createStaffSession(app!, db!, ['KYC']);
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/outbox')
      .set('Authorization', `Bearer ${limited.accessToken}`);
    expect(res.status).toBe(403);
  });

  t('GET /staff/outbox — ro‘yxat va filtr ishlaydi', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    const staff = await fullStaff();
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/outbox')
      .query({ status: 'PENDING', eventType: 'CONTRACT_CREATED' })
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect((res.body.items as { id: string }[]).some((e) => e.id === outboxId)).toBe(true);
  });

  t('GET /staff/outbox/:id — deliveryAttempts bilan to‘liq tafsilot', async () => {
    const { contractId } = await createContract();
    const outboxId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    await worker.runBatch();
    const staff = await fullStaff();
    const res = await request(app!.getHttpServer())
      .get(`/api/v1/staff/outbox/${outboxId}`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(res.body.status).toBe('SENT');
    expect(res.body.deliveryAttempts).toHaveLength(1);
  });

  t('POST /staff/outbox/:id/retry — FAQAT DEAD/SKIPPED’ni PENDING’ga qaytaradi, PENDING’ni rad etadi', async () => {
    const { contractId } = await createContract();
    const deadId = await enqueueRaw({ eventType: 'SOME_FUTURE_EVENT_NOT_YET_CODED', aggregateType: 'CONTRACT', aggregateId: contractId });
    await worker.runBatch();
    const dead = await db!.outboxEvent.findUniqueOrThrow({ where: { id: deadId } });
    expect(dead.status).toBe('DEAD');

    const staff = await fullStaff();
    const retried = await request(app!.getHttpServer())
      .post(`/api/v1/staff/outbox/${deadId}/retry`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(retried.body.status).toBe('PENDING');

    const pendingId = await enqueueRaw({ eventType: 'CONTRACT_CREATED', aggregateType: 'CONTRACT', aggregateId: contractId });
    const rejected = await request(app!.getHttpServer())
      .post(`/api/v1/staff/outbox/${pendingId}/retry`)
      .set('Authorization', `Bearer ${staff.accessToken}`);
    expect(rejected.status).toBe(409);
  });

  t('GET /staff/outbox/summary — pending/dead sonlarini qaytaradi', async () => {
    const staff = await fullStaff();
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/outbox/summary')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(typeof res.body.pending).toBe('number');
    expect(typeof res.body.dead).toBe('number');
  });
});
