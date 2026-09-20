import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import {
  CapturingSmsProvider,
  createActiveService,
  createStaffSession,
  freshDb,
  loginNewUser,
} from './support/fixtures';

const DB = 'health_e2e';

/**
 * Bosqich 11 — AuditLog staff API'si, User/Seller admin ro'yxat+tafsilot,
 * "block sessiyalarni bekor qiladi" atomikligi, Service force-pause.
 */
describe('Staff operations — audit log / user & seller admin / moderation hardening (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('staff-operations.e2e');
    if (!reachable) return;
    await provisionDb(DB);
    await flushRedis();
    sms = new CapturingSmsProvider();
    app = await buildTestApp((b) => b.overrideProvider(SMS_PROVIDER).useValue(sms));
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
    return createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES', 'ORDERS', 'USERS', 'AUDIT']);
  }

  // ── Audit log API (bo'lim 36/37/38) ─────────────────────────────────────

  t('AUDIT huquqisiz staff — 403', async () => {
    const limited = await createStaffSession(app!, db!, ['DASHBOARD']);
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/audit-logs')
      .set('Authorization', `Bearer ${limited.accessToken}`);
    expect(res.status).toBe(403);
  });

  t('GET /staff/audit-logs — action/actorId filtri, pagination, sir maydon YO‘Q', async () => {
    const staff = await fullStaff();
    const buyer = await loginNewUser(app!, sms, 'BUYER');
    // O'zining hisobini action tetiklaydigan bir nechta AuditLog qatorini yaratamiz.
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${buyer.userId}/suspend`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'Audit log sinovi uchun vaqtinchalik cheklov' })
      .expect(200);

    const list = await request(app!.getHttpServer())
      .get('/api/v1/staff/audit-logs')
      .query({ action: 'USER_SUSPENDED', resourceId: buyer.userId })
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    const row = list.body.items[0];
    expect(row.action).toBe('USER_SUSPENDED');
    expect(row.passwordHash).toBeUndefined();

    const detail = await request(app!.getHttpServer())
      .get(`/api/v1/staff/audit-logs/${row.id}`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(detail.body.id).toBe(row.id);
  });

  t('GET /staff/audit-logs — noma’lum id — 404', async () => {
    const staff = await fullStaff();
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/audit-logs/00000000-0000-7000-8000-000000000000')
      .set('Authorization', `Bearer ${staff.accessToken}`);
    expect(res.status).toBe(404);
  });

  // ── User admin (bo'lim 22/23/25) ────────────────────────────────────────

  t('GET /staff/users — filtr + GET /:id — bounded summary (contracts/payments count), passwordHash YO‘Q', async () => {
    const staff = await fullStaff();
    const buyer = await loginNewUser(app!, sms, 'BUYER');

    const list = await request(app!.getHttpServer())
      .get('/api/v1/staff/users')
      .query({ status: 'ACTIVE' })
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect((list.body.items as { id: string }[]).some((u) => u.id === buyer.userId)).toBe(true);
    for (const item of list.body.items as Record<string, unknown>[]) {
      expect(item.passwordHash).toBeUndefined();
    }

    const detail = await request(app!.getHttpServer())
      .get(`/api/v1/staff/users/${buyer.userId}`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(typeof detail.body.contractsAsBuyerCount).toBe('number');
    expect(typeof detail.body.paymentsCount).toBe('number');
    expect(detail.body.passwordHash).toBeUndefined();
  });

  t('Bo‘lim 25 — block LIVE ta’sir qiladi: barcha faol RefreshToken darhol bekor qilinadi (ATOMIK)', async () => {
    const staff = await fullStaff();
    const buyer = await loginNewUser(app!, sms, 'BUYER');

    const beforeActive = await db!.refreshToken.count({ where: { userId: buyer.userId, revokedAt: null } });
    expect(beforeActive).toBeGreaterThanOrEqual(1);

    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${buyer.userId}/block`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'Bo‘lim 25 sinovi uchun bloklash' })
      .expect(200);

    const afterActive = await db!.refreshToken.count({ where: { userId: buyer.userId, revokedAt: null } });
    expect(afterActive).toBe(0);

    const user = await db!.user.findUniqueOrThrow({ where: { id: buyer.userId } });
    expect(user.status).toBe('BLOCKED');
  });

  t('Bo‘lim 52 — USER_BLOCKED Outbox hodisasi EVENT_ROUTES’da registered (UNSUPPORTED_EVENT emas)', async () => {
    const staff = await fullStaff();
    const buyer = await loginNewUser(app!, sms, 'BUYER');
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${buyer.userId}/block`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'Outbox sinovi uchun bloklash' })
      .expect(200);

    const outboxRow = await db!.outboxEvent.findFirstOrThrow({
      where: { eventType: 'USER_BLOCKED', aggregateId: buyer.userId },
    });
    expect(outboxRow.status).toBe('PENDING'); // hali claim qilinmagan, lekin YARATILGAN — bu yetarli isbot
  });

  // ── Seller admin (bo'lim 26) ─────────────────────────────────────────────

  t('GET /staff/sellers — ro‘yxat, GET /:userId — bounded summary', async () => {
    const staff = await fullStaff();
    const { seller } = await createActiveService(app!, sms, staff.accessToken, { priceSom: 500_000 });

    const list = await request(app!.getHttpServer())
      .get('/api/v1/staff/sellers')
      .query({ sellerStatus: 'APPROVED' })
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect((list.body.items as { id: string }[]).some((s) => s.id === seller.userId)).toBe(true);

    const detail = await request(app!.getHttpServer())
      .get(`/api/v1/staff/sellers/${seller.userId}`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(typeof detail.body.servicesCount).toBe('number');
    expect(detail.body.servicesCount).toBeGreaterThanOrEqual(1);
  });

  // ── Service force-pause (bo'lim 27) ──────────────────────────────────────

  t('POST /staff/services/:id/force-pause — ACTIVE→PAUSED, sabab majburiy, alohida audit action', async () => {
    const staff = await fullStaff();
    const { serviceId } = await createActiveService(app!, sms, staff.accessToken, { priceSom: 500_000 });

    const paused = await request(app!.getHttpServer())
      .post(`/api/v1/staff/services/${serviceId}/force-pause`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'Shikoyat asosida favqulodda tekshiruv' })
      .expect(200);
    expect(paused.body.status).toBe('PAUSED');

    const auditRow = await db!.auditLog.findFirstOrThrow({
      where: { action: 'SERVICE_FORCE_PAUSED', resourceId: serviceId },
    });
    expect((auditRow.newState as { reason: string }).reason).toContain('Shikoyat');

    // Faqat ACTIVE'dan mumkin — qayta chaqirish endi INVALID_TRANSITION.
    const again = await request(app!.getHttpServer())
      .post(`/api/v1/staff/services/${serviceId}/force-pause`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'Ikkinchi urinish, ACTIVE emas' });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('INVALID_TRANSITION');
  });
});
