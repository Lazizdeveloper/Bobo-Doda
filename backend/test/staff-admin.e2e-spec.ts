import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { CapturingSmsProvider, createStaffSession, freshDb } from './support/fixtures';

const DB = 'health_e2e';

/**
 * Bosqich 11 — staff lifecycle, granular permissions, `SUPER_ADMIN`
 * gating, sessiya boshqaruvi, parol o'zgartirish/reset. TOTP enrollment —
 * `staff-auth.e2e-spec.ts`da (mavjud "staff auth" fayli, tabiiy joy).
 */
describe('Staff admin — lifecycle/permissions/sessions (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('staff-admin.e2e');
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

  /** STAFF huquqiga ega, lekin SUPER_ADMIN EMAS — create/permissions endpointlari uchun 403 kutiladi. */
  async function opsStaffWithStaffPermission() {
    return createStaffSession(app!, db!, ['STAFF'], 'OPERATIONS');
  }
  /** STAFF huquqi + SUPER_ADMIN — create/permissions endpointlari uchun. */
  async function superAdmin() {
    return createStaffSession(app!, db!, ['STAFF'], 'SUPER_ADMIN');
  }

  function createStaffMemberPayload(overrides: Record<string, unknown> = {}) {
    return {
      email: `new-${Date.now()}-${Math.random().toString(36).slice(2)}@bobododa.uz`,
      fullName: 'Yangi Xodim',
      title: 'Operator',
      role: 'OPERATIONS',
      permissions: ['DASHBOARD'],
      ...overrides,
    };
  }

  // ── Create ────────────────────────────────────────────────────────────

  t('POST /staff/admin/staff-members — SUPER_ADMIN yarata oladi, tempPassword bir marta qaytadi, mustChangePassword=true', async () => {
    const admin = await superAdmin();
    const payload = createStaffMemberPayload();
    const res = await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)
      .expect(200);
    expect(typeof res.body.tempPassword).toBe('string');
    expect(res.body.tempPassword.length).toBeGreaterThan(20);
    expect(res.body.mustChangePassword).toBe(true);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.totpSecret).toBeUndefined();

    // Yangi hisob HAQIQATAN shu vaqtinchalik parol bilan login qila oladi.
    const login = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: payload.email, password: res.body.tempPassword })
      .expect(200);
    expect(login.body.mustChangePassword).toBe(true);
  });

  t('POST /staff/admin/staff-members — bir xil email ikkinchi marta — ALREADY_EXISTS', async () => {
    const admin = await superAdmin();
    const payload = createStaffMemberPayload();
    await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)
      .expect(200);
    const dup = await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload);
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('ALREADY_EXISTS');
  });

  t('POST /staff/admin/staff-members — STAFF huquqi bor, lekin SUPER_ADMIN EMAS — 403', async () => {
    const ops = await opsStaffWithStaffPermission();
    const res = await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${ops.accessToken}`)
      .send(createStaffMemberPayload());
    expect(res.status).toBe(403);
  });

  t('POST /staff/admin/staff-members — STAFF huquqisiz (boshqa permission) — 403', async () => {
    const noPerm = await createStaffSession(app!, db!, ['DASHBOARD'], 'SUPER_ADMIN');
    const res = await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${noPerm.accessToken}`)
      .send(createStaffMemberPayload());
    expect(res.status).toBe(403);
  });

  // ── List/detail ──────────────────────────────────────────────────────

  t('GET /staff/admin/staff-members — ro‘yxat + status filtri, GET /:id tafsilot, sir maydonlar YO‘Q', async () => {
    const admin = await superAdmin();
    const payload = createStaffMemberPayload();
    const created = await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload)
      .expect(200);

    const list = await request(app!.getHttpServer())
      .get('/api/v1/staff/admin/staff-members')
      .query({ status: 'ACTIVE', email: payload.email })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect((list.body.items as { id: string }[]).some((s) => s.id === created.body.id)).toBe(true);
    for (const item of list.body.items as Record<string, unknown>[]) {
      expect(item.passwordHash).toBeUndefined();
      expect(item.totpSecret).toBeUndefined();
      expect(item.pendingTotpSecret).toBeUndefined();
    }

    const detail = await request(app!.getHttpServer())
      .get(`/api/v1/staff/admin/staff-members/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(detail.body.email).toBe(payload.email);
    expect(detail.body.passwordHash).toBeUndefined();
  });

  // ── Permissions ──────────────────────────────────────────────────────

  t('PATCH .../:id/permissions — SUPER_ADMIN o‘zgartira oladi, AuditLog before/after bilan yoziladi', async () => {
    const admin = await superAdmin();
    const created = await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(createStaffMemberPayload({ permissions: ['DASHBOARD'] }))
      .expect(200);

    const updated = await request(app!.getHttpServer())
      .patch(`/api/v1/staff/admin/staff-members/${created.body.id}/permissions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ permissions: ['DASHBOARD', 'AUDIT', 'USERS'] })
      .expect(200);
    expect(updated.body.permissions.sort()).toEqual(['AUDIT', 'DASHBOARD', 'USERS']);

    const auditRow = await db!.auditLog.findFirst({
      where: { action: 'STAFF_PERMISSIONS_UPDATED', resourceId: created.body.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRow).toBeDefined();
    expect((auditRow!.previousState as { permissions: string[] }).permissions).toEqual(['DASHBOARD']);
    expect((auditRow!.newState as { permissions: string[] }).permissions.sort()).toEqual(['AUDIT', 'DASHBOARD', 'USERS']);
  });

  t('PATCH .../:id/permissions — o‘ziga tegishli (self) — 403 (bo‘lim 18: o‘z ruxsatini o‘zi oshira olmaydi)', async () => {
    const admin = await superAdmin();
    const me = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const res = await request(app!.getHttpServer())
      .patch(`/api/v1/staff/admin/staff-members/${me.body.id}/permissions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ permissions: ['DASHBOARD', 'STAFF', 'SETTINGS'] });
    expect(res.status).toBe(403);
  });

  t('PATCH .../:id/permissions — SUPER_ADMIN EMAS — 403', async () => {
    const ops = await opsStaffWithStaffPermission();
    const admin = await superAdmin();
    const created = await request(app!.getHttpServer())
      .post('/api/v1/staff/admin/staff-members')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(createStaffMemberPayload())
      .expect(200);
    const res = await request(app!.getHttpServer())
      .patch(`/api/v1/staff/admin/staff-members/${created.body.id}/permissions`)
      .set('Authorization', `Bearer ${ops.accessToken}`)
      .send({ permissions: ['DASHBOARD'] });
    expect(res.status).toBe(403);
  });

  // ── Status lifecycle ─────────────────────────────────────────────────

  t('POST .../:id/suspend — sessiyalar DARHOL bekor qilinadi (eski access token ham rad etiladi)', async () => {
    const admin = await superAdmin();
    const target = await createStaffSession(app!, db!, ['DASHBOARD']);

    const suspend = await request(app!.getHttpServer())
      .post(`/api/v1/staff/admin/staff-members/${target.staffId}/suspend`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'Tekshiruv davomida vaqtinchalik cheklov' })
      .expect(200);
    expect(suspend.body.status).toBe('SUSPENDED');

    const blocked = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${target.accessToken}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('ACCOUNT_BLOCKED');
  });

  t('POST .../:id/suspend — o‘zini-o‘zi cheklay olmaydi (self) — 403', async () => {
    const admin = await superAdmin();
    const me = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const res = await request(app!.getHttpServer())
      .post(`/api/v1/staff/admin/staff-members/${me.body.id}/suspend`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: "O'zini-o'zi tekshirish" });
    expect(res.status).toBe(403);
  });

  t('POST .../:id/reactivate — SUSPENDED’ni ACTIVE’ga qaytaradi', async () => {
    const admin = await superAdmin();
    const target = await createStaffSession(app!, db!, ['DASHBOARD']);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/admin/staff-members/${target.staffId}/suspend`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'Vaqtinchalik tekshiruv uchun' })
      .expect(200);
    const reactivated = await request(app!.getHttpServer())
      .post(`/api/v1/staff/admin/staff-members/${target.staffId}/reactivate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(reactivated.body.status).toBe('ACTIVE');
  });

  // ── Last-admin protection (bo'lim 19) ────────────────────────────────

  t('Yagona FAOL SUPER_ADMIN’ni disable qilishga urinish — LAST_ADMIN_PROTECTED (409)', async () => {
    // E'tibor: DB'da boshqa testlardan qolgan SUPER_ADMIN bo'lmasligi uchun
    // shu testda ikkita SUPER_ADMIN yaratamiz va BITTASINI avval disable
    // qilib "yagona" holatga keltiramiz — bu boshqa parallel testlardan
    // mustaqil (globalCount emas, ANIQ shu ikkitasi ustida ishlaymiz).
    const alwaysActive = await superAdmin();
    const target = await superAdmin();

    // Boshqa testlar ilgari yaratgan SUPER_ADMIN'lar bo'lishi mumkin —
    // shuning uchun "yagona" da'voni to'g'ridan-to'g'ri EMAS, balki
    // funksional xulq-atvor orqali tekshiramiz: agar `target`ni disable
    // qilish LAST_ADMIN_PROTECTED bersa — demak boshqa faol SUPER_ADMIN yo'q
    // edi; aks holda (200) — boshqa faol SUPER_ADMIN bor edi. Ikkalasi ham
    // to'g'ri xulq-atvor, lekin aniq isbot uchun DB darajasida tozalaymiz:
    await db!.staffMember.updateMany({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', id: { notIn: [alwaysActive.staffId, target.staffId] } },
      data: { status: 'DISABLED' },
    });
    // Endi FAQAT ikkita faol SUPER_ADMIN bor: alwaysActive va target.
    // `alwaysActive`ni disable qilamiz — `target` hali qoladi, demak bu ISHLASHI kerak.
    const first = await request(app!.getHttpServer())
      .post(`/api/v1/staff/admin/staff-members/${target.staffId}/disable`)
      .set('Authorization', `Bearer ${alwaysActive.accessToken}`)
      .send({ reason: "Birinchi — ikkinchisi hali faol" })
      .expect(200);
    expect(first.body.status).toBe('DISABLED');

    // Endi FAQAT `alwaysActive` faol SUPER_ADMIN qoldi — uni (BOSHQA
    // admin orqali, o'ziga emas) disable qilishga urinish TAQIQLANISHI
    // kerak. MUHIM: aktyor sifatida YANA bitta SUPER_ADMIN YARATMAYMIZ —
    // bu o'zi "faol SUPER_ADMIN" sonini oshirib, sinovni buzardi. `disable`
    // endpointi faqat `STAFF` huquqini talab qiladi (`SUPER_ADMIN` rolini
    // EMAS), shuning uchun oddiy OPERATIONS+STAFF aktyor yetarli.
    const opsActor = await opsStaffWithStaffPermission();
    const blocked = await request(app!.getHttpServer())
      .post(`/api/v1/staff/admin/staff-members/${alwaysActive.staffId}/disable`)
      .set('Authorization', `Bearer ${opsActor.accessToken}`)
      .send({ reason: 'Yagona qolganini disable qilishga urinish' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('LAST_ADMIN_PROTECTED');
  });

  // ── Sessions ─────────────────────────────────────────────────────────

  t('GET/DELETE /staff/me/sessions — o‘z sessiyalarini ko‘radi va bekor qiladi', async () => {
    const staff = await createStaffSession(app!, db!, ['DASHBOARD']);
    const list = await request(app!.getHttpServer())
      .get('/api/v1/staff/me/sessions')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(1);
    expect(list.body[0].id).toBeDefined();

    const revoked = await request(app!.getHttpServer())
      .delete(`/api/v1/staff/me/sessions/${list.body[0].id}`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(revoked.body.ok).toBe(true);
  });

  t('DELETE /staff/admin/staff-members/:id/sessions — admin boshqa staff sessiyasini bekor qiladi (LIVE ta’sir)', async () => {
    const admin = await superAdmin();
    const target = await createStaffSession(app!, db!, ['DASHBOARD']);
    await request(app!.getHttpServer())
      .delete(`/api/v1/staff/admin/staff-members/${target.staffId}/sessions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${target.accessToken}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  // ── Password change/reset ────────────────────────────────────────────

  t('POST /staff/me/change-password — joriy parol noto‘g‘ri bo‘lsa INVALID_CURRENT_PASSWORD', async () => {
    const staff = await createStaffSession(app!, db!, ['DASHBOARD']);
    const res = await request(app!.getHttpServer())
      .post('/api/v1/staff/me/change-password')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ currentPassword: 'wrong-one', newPassword: 'BrandNewPassword123' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  t('POST /staff/me/change-password — muvaffaqiyatli: boshqa sessiyalar bekor, JORIY sessiya ishlayveradi', async () => {
    const staff = await createStaffSession(app!, db!, ['DASHBOARD']);
    // Ikkinchi (boshqa) sessiya — bir xil hisobga qayta login.
    const member = await db!.staffMember.findUniqueOrThrow({ where: { id: staff.staffId } });
    const secondLogin = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: member.email, password: 'SuperSecret123!' })
      .expect(200);

    await request(app!.getHttpServer())
      .post('/api/v1/staff/me/change-password')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ currentPassword: 'SuperSecret123!', newPassword: 'BrandNewPassword123' })
      .expect(200);

    // Joriy (parolni o'zgartirgan) sessiya HALI ishlaydi.
    await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    // Ikkinchi (boshqa) sessiya BEKOR qilingan.
    const other = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${secondLogin.body.accessToken}`);
    expect(other.status).toBe(401);
  });

  t('POST .../:id/password-reset — tempPassword qaytaradi, mustChangePassword=true, eski sessiyalar bekor', async () => {
    const admin = await superAdmin();
    const target = await createStaffSession(app!, db!, ['DASHBOARD']);
    const res = await request(app!.getHttpServer())
      .post(`/api/v1/staff/admin/staff-members/${target.staffId}/password-reset`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(typeof res.body.tempPassword).toBe('string');

    const oldSessionRes = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${target.accessToken}`);
    expect(oldSessionRes.status).toBe(401);

    const member = await db!.staffMember.findUniqueOrThrow({ where: { id: target.staffId } });
    expect(member.mustChangePassword).toBe(true);

    const login = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: member.email, password: res.body.tempPassword })
      .expect(200);
    expect(login.body.mustChangePassword).toBe(true);
  });

  // ── Rate limiting (bo'lim 42) ────────────────────────────────────────

  t('Staff login — bir xil email uchun ketma-ket noto‘g‘ri urinishlar chegaradan o‘tsa RATE_LIMITED', async () => {
    const staff = await createStaffSession(app!, db!, ['DASHBOARD']);
    const member = await db!.staffMember.findUniqueOrThrow({ where: { id: staff.staffId } });

    let lastStatus = 0;
    let lastCode: string | undefined;
    for (let i = 0; i < 15; i += 1) {
      const res = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email: member.email, password: 'definitely-wrong' });
      lastStatus = res.status;
      lastCode = res.body.code as string | undefined;
      if (lastCode === 'RATE_LIMITED') break;
    }
    expect(lastStatus).toBe(429);
    expect(lastCode).toBe('RATE_LIMITED');
  });
});
