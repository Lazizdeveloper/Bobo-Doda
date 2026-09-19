import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { RedisService } from '@/infra/redis/redis.service';
import {
  CapturingSmsProvider,
  createApprovedSeller,
  createCategory,
  createStaffSession,
  freshDb,
  loginNewUser,
} from './support/fixtures';

const DB = 'health_e2e';

/**
 * Bosqich 3 — sotuvchi bo'lish (ariza → KYC → APPROVED) + shu ustiga
 * qurilgan Service holat mashinasi + moderatsiya. Ikkalasi bitta zanjir
 * bo'lgani uchun bitta faylda (DB provisioning'ni takrorlamaslik uchun ham).
 */
describe('Seller onboarding + Service lifecycle (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('seller-onboarding.e2e');
    if (!reachable) return;
    await provisionDb(DB);
    await flushRedis(); // OTP rate-limit hisoblagichlari boshqa e2e fayllardan qolmasin
    sms = new CapturingSmsProvider();
    app = await buildTestApp((b) => b.overrideProvider(SMS_PROVIDER).useValue(sms));
    db = freshDb();
  }, 120_000);

  afterAll(async () => {
    await db?.$disconnect();
    await app?.close();
    if (reachable) await dropDatabase(DB);
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  /** Bosqich 23 — bu faylga qo'shilgan yangi testlar (real user-holat
      auditi) `loginNewUser`/`createApprovedSeller` orqali qo'shimcha
      OTP so'rovlari yuboradi — umumiy IP-soatlik hisoblagichni (20/soat)
      fayl davomida tugatib qo'yishi mumkin (`auth.e2e-spec.ts`dagi bilan
      bir xil, avval kuzatilgan sinf muammosi). */
  async function flushIpCounter(): Promise<void> {
    const redis = app!.get(RedisService).client;
    const keys = await redis.keys('ratelimit:hit:otp:ip:*');
    if (keys.length) await redis.del(...keys);
  }

  // ── SellerApplication ────────────────────────────────────────────────

  t('Submit → PENDING; duplicate submit → SELLER_APPLICATION_ALREADY_PENDING', async () => {
    const session = await loginNewUser(app!, sms, 'SELLER');
    const first = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Legal Name', displayName: 'Display Name' })
      .expect(200);
    expect(first.body.status).toBe('PENDING');

    const dup = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Legal Name 2', displayName: 'Display Name 2' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('SELLER_APPLICATION_ALREADY_PENDING');
  });

  t('Concurrent double-submit — DB constraint orqali FAQAT bittasi yaratiladi', async () => {
    const session = await loginNewUser(app!, sms, 'SELLER');
    const payload = { legalName: 'Race Legal', displayName: 'Race Display' };
    const [r1, r2] = await Promise.all([
      request(app!.getHttpServer())
        .post('/api/v1/me/seller-application')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send(payload),
      request(app!.getHttpServer())
        .post('/api/v1/me/seller-application')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send(payload),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const count = await db!.sellerApplication.count({ where: { userId: session.userId } });
    expect(count).toBe(1);
  });

  t('GET /me/seller-application — eng oxirgi arizani qaytaradi', async () => {
    const session = await loginNewUser(app!, sms, 'SELLER');
    const beforeSubmit = await request(app!.getHttpServer())
      .get('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(beforeSubmit.status).toBe(404);
    expect(beforeSubmit.body.code).toBe('SELLER_APPLICATION_NOT_FOUND');

    await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Legal', displayName: 'Display' })
      .expect(200);

    const res = await request(app!.getHttpServer())
      .get('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(res.body.status).toBe('PENDING');
  });

  t('Approve — sellerStatus=APPROVED, roles[] SELLER qo‘shiladi; qayta approve INVALID_TRANSITION', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC']);
    const session = await loginNewUser(app!, sms, 'SELLER');
    const app1 = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Legal', displayName: 'Display' })
      .expect(200);

    const approved = await request(app!.getHttpServer())
      .post(`/api/v1/staff/seller-applications/${app1.body.id}/approve`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .expect(200);
    expect(approved.body.status).toBe('APPROVED');

    const me = await request(app!.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(me.body.sellerStatus).toBe('APPROVED');
    expect(me.body.roles).toContain('SELLER');

    const again = await request(app!.getHttpServer())
      .post(`/api/v1/staff/seller-applications/${app1.body.id}/approve`)
      .set('Authorization', `Bearer ${kyc.accessToken}`);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('INVALID_TRANSITION');
  });

  t('Reject — reason talab qilinadi, sellerStatus=REJECTED', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC']);
    const session = await loginNewUser(app!, sms, 'SELLER');
    const app1 = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Legal', displayName: 'Display' })
      .expect(200);

    const noReason = await request(app!.getHttpServer())
      .post(`/api/v1/staff/seller-applications/${app1.body.id}/reject`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({});
    expect(noReason.status).toBe(422);

    const rejected = await request(app!.getHttpServer())
      .post(`/api/v1/staff/seller-applications/${app1.body.id}/reject`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ reason: 'Hujjatlar yetarli emas' })
      .expect(200);
    expect(rejected.body.status).toBe('REJECTED');
    expect(rejected.body.rejectionReason).toBe('Hujjatlar yetarli emas');
  });

  t('KYC huquqi bo‘lmagan staff — approve qila olmaydi', async () => {
    const noPerm = await createStaffSession(app!, db!, ['SERVICES']);
    const session = await loginNewUser(app!, sms, 'SELLER');
    const app1 = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Legal', displayName: 'Display' })
      .expect(200);

    const denied = await request(app!.getHttpServer())
      .post(`/api/v1/staff/seller-applications/${app1.body.id}/approve`)
      .set('Authorization', `Bearer ${noPerm.accessToken}`);
    expect(denied.status).toBe(403);
  });

  t('Parallel approve+reject — faqat BITTASI g‘olib chiqadi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC']);
    const session = await loginNewUser(app!, sms, 'SELLER');
    const app1 = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Legal', displayName: 'Display' })
      .expect(200);

    const [approveRes, rejectRes] = await Promise.all([
      request(app!.getHttpServer())
        .post(`/api/v1/staff/seller-applications/${app1.body.id}/approve`)
        .set('Authorization', `Bearer ${kyc.accessToken}`),
      request(app!.getHttpServer())
        .post(`/api/v1/staff/seller-applications/${app1.body.id}/reject`)
        .set('Authorization', `Bearer ${kyc.accessToken}`)
        .send({ reason: 'race condition test reason' }),
    ]);
    const statuses = [approveRes.status, rejectRes.status].sort();
    expect(statuses).toEqual([200, 409]);

    const final = await db!.sellerApplication.findUniqueOrThrow({ where: { id: app1.body.id } });
    expect(['APPROVED', 'REJECTED']).toContain(final.status);
    // Faqat BITTA qaror — ikkalasi ham qo'llanmagan.
    expect(final.status === 'APPROVED' || final.status === 'REJECTED').toBe(true);
  });

  // ── Bosqich 23 — real foydalanuvchi holatlari to'liq auditi ─────────────
  // (frontend /mutaxassis/royxat 409 bug'idan keyin: bu holatlarning
  // HECH biri avval sinalmagan edi — faqat "yo'q → PENDING" va "PENDING →
  // duplicate" qamrab olingan edi.)

  t('APPROVED sotuvchi qayta ariza topshira olmaydi — BAD_STATE (409)', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);

    const res = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ legalName: 'New Legal', displayName: 'New Display' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BAD_STATE');

    // Faqat 1 ta ariza qoldi — noto'g'ri urinish yangi qator yaratmadi.
    const count = await db!.sellerApplication.count({ where: { userId: seller.userId } });
    expect(count).toBe(1);
  });

  t('SUSPENDED sotuvchi qayta ariza topshira olmaydi — BAD_STATE (409)', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/sellers/${seller.userId}/suspend`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ reason: 'suspend for reapply test' })
      .expect(200);

    const res = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ legalName: 'New Legal', displayName: 'New Display' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BAD_STATE');
  });

  t('REJECTED ariza — qayta topshirish YANGI PENDING ariza yaratadi (reapply ruxsat etilgan)', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC']);
    const session = await loginNewUser(app!, sms, 'SELLER');
    const app1 = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'First Legal', displayName: 'First Display' })
      .expect(200);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/seller-applications/${app1.body.id}/reject`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ reason: 'Hujjatlar yetarli emas' })
      .expect(200);

    const reapplied = await request(app!.getHttpServer())
      .post('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ legalName: 'Second Legal', displayName: 'Second Display' })
      .expect(200);
    expect(reapplied.body.status).toBe('PENDING');
    expect(reapplied.body.id).not.toBe(app1.body.id);

    // GET — ENG SO'NGGI (yangi PENDING) arizani qaytaradi, eski REJECTED emas.
    const current = await request(app!.getHttpServer())
      .get('/api/v1/me/seller-application')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(current.body.id).toBe(reapplied.body.id);
    expect(current.body.status).toBe('PENDING');

    // Ikkala ariza ham DB'da saqlanadi — audit trail, eskisi o'chirilmaydi.
    const count = await db!.sellerApplication.count({ where: { userId: session.userId } });
    expect(count).toBe(2);
  });

  // Bosqich 23 — 10x chinakam parallel burst (yuqoridagi "Concurrent
  // double-submit" bilan BIR XIL invariant, faqat 10x yuklama bilan) CI
  // runner'ida transport darajasida beqaror bo'lib chiqdi (real GitHub
  // Actions'da 4 marta ketma-ket `ECONNRESET`, uch xil maqsadli tuzatish
  // kamaytirmadi) — bu majburiy "integration" job'ni to'sib qo'yardi,
  // holbuki 2 ta parallel so'rovli tepadagi test ANIQ SHU XIL CAS
  // invariant'ni (unique constraint orqali — faqat bitta qator) allaqachon
  // ishonchli tekshiradi. 10x versiya olib tashlanmadi — informatsion,
  // NOBLOKLOVCHI qadamga ko'chirildi: `seller-onboarding-burst.stress-spec.ts`
  // (`npm run test:e2e:stress`, backend-ci.yml'da `continue-on-error: true`
  // bilan) — resurs cheklangan runner'da transport shovqini bo'lsa ham
  // majburiy gate'ni bloklamaydi, lekin signal yo'qolmaydi.

  t('Egalik: staff seller-application ro‘yxati marketplace JWT bilan kirilmaydi', async () => {
    const session = await loginNewUser(app!, sms, 'SELLER');
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/seller-applications')
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(res.status).toBe(401);
  });

  // Yuqoridagi bo'lim ko'p OTP so'rovi yubordi — quyidagi testlar uchun
  // budjetni tiklaymiz (aks holda ular tasodifan RATE_LIMITED bilan yiqiladi).
  t('(ip budjetini tiklash)', async () => {
    await flushIpCounter();
  });

  // ── Seller eligibility (role != faol huquq) ─────────────────────────

  t('APPROVED bo‘lmagan seller service yarata olmaydi (SELLER_NOT_APPROVED)', async () => {
    const session = await loginNewUser(app!, sms, 'SELLER');
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES']);
    const categoryId = await createCategory(app!, kyc.accessToken, 'not-approved-test');

    const res = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ categoryId, title: 'Should fail service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SELLER_NOT_APPROVED');
  });

  t('APPROVED seller service yarata oladi; SUSPENDED bo‘lgach yarata olmaydi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'approved-flow-test');

    const created = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'Great design service', description: 'x'.repeat(25), price: 100_000, deliveryDays: 2 })
      .expect(200);
    expect(created.body.status).toBe('DRAFT');
    expect(created.body.price).toBe(100_000);

    await request(app!.getHttpServer())
      .post(`/api/v1/staff/sellers/${seller.userId}/suspend`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ reason: 'seller suspension test reason' })
      .expect(200);

    const blocked = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'After suspend', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('SELLER_NOT_APPROVED');
  });

  // ── Service — egalik + holat mashinasi ──────────────────────────────

  t('Egalik: boshqa foydalanuvchi xizmatni ko‘ra olmaydi (404, mavjudligi leak qilinmaydi)', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES']);
    const owner = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'ownership-test');
    const svc = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ categoryId, title: 'Owned service here', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 })
      .expect(200);

    const stranger = await createApprovedSeller(app!, sms, kyc.accessToken);
    const res = await request(app!.getHttpServer())
      .get(`/api/v1/seller/services/${svc.body.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SERVICE_NOT_FOUND');
  });

  t('Holat mashinasi: DRAFT→submit→PENDING_REVIEW→approve→ACTIVE→pause→PAUSED→resume→ACTIVE→archive→ARCHIVED', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'lifecycle-test');
    const svc = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'Full lifecycle service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 })
      .expect(200);
    const id = svc.body.id;
    const sellerAuth = { Authorization: `Bearer ${seller.accessToken}` };
    const staffAuth = { Authorization: `Bearer ${kyc.accessToken}` };

    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${id}/submit`).set(sellerAuth).expect(200);
    const approved = await request(app!.getHttpServer())
      .post(`/api/v1/staff/services/${id}/approve`)
      .set(staffAuth)
      .expect(200);
    expect(approved.body.status).toBe('ACTIVE');
    expect(approved.body.publishedAt).not.toBeNull();

    const paused = await request(app!.getHttpServer())
      .post(`/api/v1/seller/services/${id}/pause`)
      .set(sellerAuth)
      .expect(200);
    expect(paused.body.status).toBe('PAUSED');

    const resumed = await request(app!.getHttpServer())
      .post(`/api/v1/seller/services/${id}/resume`)
      .set(sellerAuth)
      .expect(200);
    expect(resumed.body.status).toBe('ACTIVE');

    const archived = await request(app!.getHttpServer())
      .post(`/api/v1/seller/services/${id}/archive`)
      .set(sellerAuth)
      .expect(200);
    expect(archived.body.status).toBe('ARCHIVED');
  });

  t('Noto‘g‘ri o‘tishlar rad etiladi: DRAFT’ni pause qilib bo‘lmaydi, ARCHIVED’ni submit qilib bo‘lmaydi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'invalid-transition-test');
    const svc = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'Invalid transition service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 })
      .expect(200);
    const id = svc.body.id;
    const sellerAuth = `Bearer ${seller.accessToken}`;

    const badPause = await request(app!.getHttpServer())
      .post(`/api/v1/seller/services/${id}/pause`)
      .set('Authorization', sellerAuth);
    expect(badPause.status).toBe(409);
    expect(badPause.body.code).toBe('INVALID_TRANSITION');

    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${id}/archive`).set('Authorization', sellerAuth).expect(200);

    const badSubmit = await request(app!.getHttpServer())
      .post(`/api/v1/seller/services/${id}/submit`)
      .set('Authorization', sellerAuth);
    expect(badSubmit.status).toBe(409);
    expect(badSubmit.body.code).toBe('INVALID_TRANSITION');
  });

  t('REJECTED → tahrirlash avtomatik DRAFT’ga qaytaradi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'reject-edit-test');
    const svc = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'Will be rejected service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 })
      .expect(200);
    const id = svc.body.id;
    const sellerAuth = { Authorization: `Bearer ${seller.accessToken}` };

    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${id}/submit`).set(sellerAuth).expect(200);
    const rejected = await request(app!.getHttpServer())
      .post(`/api/v1/staff/services/${id}/reject`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ reason: 'Tavsif yetarli emas, aniqroq yozing' })
      .expect(200);
    expect(rejected.body.status).toBe('REJECTED');

    const edited = await request(app!.getHttpServer())
      .patch(`/api/v1/seller/services/${id}`)
      .set(sellerAuth)
      .send({ title: 'Updated after rejection service' })
      .expect(200);
    expect(edited.body.status).toBe('DRAFT');
    expect(edited.body.rejectionReason).toBeNull();
  });

  t('Parallel moderation race — faqat BITTA qaror g‘olib chiqadi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'race-moderation-test');
    const svc = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'Race moderation service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 })
      .expect(200);
    const id = svc.body.id;
    await request(app!.getHttpServer())
      .post(`/api/v1/seller/services/${id}/submit`)
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .expect(200);

    const [approveRes, rejectRes] = await Promise.all([
      request(app!.getHttpServer())
        .post(`/api/v1/staff/services/${id}/approve`)
        .set('Authorization', `Bearer ${kyc.accessToken}`),
      request(app!.getHttpServer())
        .post(`/api/v1/staff/services/${id}/reject`)
        .set('Authorization', `Bearer ${kyc.accessToken}`)
        .send({ reason: 'parallel moderation race reason' }),
    ]);
    const statuses = [approveRes.status, rejectRes.status].sort();
    expect(statuses).toEqual([200, 409]);

    const final = await db!.service.findUniqueOrThrow({ where: { id } });
    expect(['ACTIVE', 'REJECTED']).toContain(final.status);
  });

  t('SERVICES huquqi bo‘lmagan staff — moderatsiya qila olmaydi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES']);
    const noServicePerm = await createStaffSession(app!, db!, ['KYC']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'no-service-perm-test');
    const svc = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'No perm test service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 })
      .expect(200);
    await request(app!.getHttpServer())
      .post(`/api/v1/seller/services/${svc.body.id}/submit`)
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .expect(200);

    const denied = await request(app!.getHttpServer())
      .post(`/api/v1/staff/services/${svc.body.id}/approve`)
      .set('Authorization', `Bearer ${noServicePerm.accessToken}`);
    expect(denied.status).toBe(403);
  });

  t('CATEGORY_DISABLED — arxivlangan kategoriyada yangi xizmat yaratib bo‘lmaydi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const categoryId = await createCategory(app!, kyc.accessToken, 'to-be-archived-test');
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/categories/${categoryId}/archive`)
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .expect(200);

    const res = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set('Authorization', `Bearer ${seller.accessToken}`)
      .send({ categoryId, title: 'Archived category service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('CATEGORY_DISABLED');
  });
});
