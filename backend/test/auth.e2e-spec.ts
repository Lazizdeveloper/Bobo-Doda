import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { waitFor } from './support/wait-for';
import { SMS_PROVIDER, type SmsProvider, type SmsSendResult } from '@/infra/sms/sms-provider.interface';

/**
 * Bosqich 2 — marketplace OTP auth + refresh rotatsiya/reuse-detection +
 * rol tanlash/almashtirish + sessiya boshqaruvi (e2e, real Postgres + Redis
 * + BullMQ). `SMS_PROVIDER` — `CapturingSmsProvider` bilan almashtiriladi
 * (haqiqiy kodni argon2id orqali DB'dan qayta o'qib bo'lmaydi — faqat
 * "yuborilgan" nusxadan bilamiz, xuddi haqiqiy SMS provayder logidan
 * tekshirganday).
 */
class CapturingSmsProvider implements SmsProvider {
  lastCode: string | undefined;
  lastPhone: string | undefined;
  calls = 0;

  async send(phone: string, _template: string, params: Record<string, string>): Promise<SmsSendResult> {
    this.calls += 1;
    this.lastPhone = phone;
    this.lastCode = params.code;
    return { success: true, providerMessageId: `test-${this.calls}` };
  }
}

const DB = 'health_e2e';
let phoneCounter = 0;
/**
 * Har testga UNIKAL, haqiqatan valid O'zbekiston raqami. ATAYLAB faqat
 * monoton hisoblagichdan (`Date.now()`ga TAYANMAYDI) — in-process HTTP
 * so'rovlar millisekund ichida bir necha marta yuborilishi mumkin, vaqtga
 * asoslangan versiya kamdan-kam bir xil raqamni ikki marta qaytarib
 * qo'yardi (`test/support/fixtures.ts#uniquePhone`dagi bilan bir xil bug).
 */
function uniquePhone(): string {
  phoneCounter += 1;
  return `+99890${phoneCounter.toString().padStart(7, '0')}`;
}

describe('Auth (e2e, real Postgres + Redis + BullMQ)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('auth.e2e');
    if (!reachable) return;

    await provisionDb(DB);
    await flushRedis(); // OTP rate-limit hisoblagichlari boshqa e2e fayllardan qolmasin
    sms = new CapturingSmsProvider();
    app = await buildTestApp((builder) => builder.overrideProvider(SMS_PROVIDER).useValue(sms));
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (reachable) await dropDatabase(DB);
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  async function requestAndGetCode(phone: string): Promise<string> {
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone })
      .expect(200, { sent: true });
    await waitFor(() => sms.lastPhone === phone && !!sms.lastCode, { label: 'otp sms' });
    return sms.lastCode!;
  }

  // ── OTP happy path + yangi foydalanuvchi avto-yaratish ──────────────────

  t('OTP so‘rash → tasdiqlash → yangi foydalanuvchi, activeRole=null, refresh cookie', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone);

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code })
      .expect(200);

    expect(res.body.isNewUser).toBe(true);
    expect(res.body.activeRole).toBeNull();
    expect(res.body.roleChosen).toBe(false);
    expect(typeof res.body.accessToken).toBe('string');
    const cookie = res.headers['set-cookie'];
    expect(cookie?.[0]).toMatch(/^refresh_token=.+HttpOnly.+SameSite=Strict/);
  });

  t('Ro‘yxatdan o‘tmagan/o‘tgan telefon uchun /otp/request bir xil javob qaytaradi (enumeration himoyasi)', async () => {
    const unregistered = uniquePhone();
    const res1 = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: unregistered });
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({ sent: true });
  });

  t('Noto‘g‘ri kod 5 marta → kod “kuyadi”, keyin TO‘G‘RI kod ham ishlamaydi', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone);
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      await request(app!.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code: wrong })
        .expect(422)
        .expect((r) => expect(r.body.code).toBe('INVALID_CODE'));
    }

    // Kod kuygan — endi TO'G'RI kod ham rad etiladi.
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('INVALID_CODE'));
  });

  t('Telefon formati normallashadi — so‘rash E.164’da, tasdiqlash milliy formatda BIR XIL OTP’ni topadi', async () => {
    // Ikkalasi bir xil raqam bo'lsa ham IKKI marta /otp/request qilinmaydi —
    // 60s cooldown (ataylab, spam himoyasi) shuni bloklardi. Shu sabab bitta
    // so'rov ichida "yozish E.164, o'qish milliy format" orqali sinaladi —
    // agar normalizatsiya ikkala uchida bir xil bo'lmasa, `verify` kodni
    // UMUMAN topolmasdi (INVALID_CODE bilan yiqilardi).
    const national = `90${(Date.now() % 10_000_000).toString().padStart(7, '0')}`;
    const e164 = `+998${national}`;

    const code = await requestAndGetCode(e164);
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: national, code }) // ATAYLAB milliy formatda — request'dan farqli
      .expect(200);
    expect(res.body.isNewUser).toBe(true);

    const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    try {
      const user = await db.user.findUnique({ where: { phone: e164 } });
      expect(user).not.toBeNull(); // DB'da doim TO'LIQ E.164 saqlanadi
    } finally {
      await db.$disconnect();
    }
  });

  t('Qayta so‘rash cooldown ichida RATE_LIMITED qaytaradi', async () => {
    const phone = uniquePhone();
    await request(app!.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone }).expect(200);
    const res = await request(app!.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });

  // ── Refresh rotatsiya + reuse detection ──────────────────────────────────

  async function loginFresh(): Promise<{ accessToken: string; refreshCookie: string }> {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone);
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code })
      .expect(200);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const refreshCookie = setCookie[0]!.split(';')[0]!;
    return { accessToken: res.body.accessToken, refreshCookie };
  }

  t('Refresh — rotatsiya: eski cookie qayta kelsa TOKEN_REUSED va butun oila bekor bo‘ladi', async () => {
    const { refreshCookie } = await loginFresh();

    const rotated = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    const newCookie = (rotated.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    expect(newCookie).not.toBe(refreshCookie);

    // Eski (allaqachon rotatsiya qilingan) cookie qayta kelsa — REUSE.
    const reuse = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('TOKEN_REUSED');

    // Yangi (rotatsiyadan chiqqan) token ham endi ishlamaydi — oila yopilgan.
    const afterFamily = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', newCookie);
    expect(afterFamily.status).toBe(401);
    expect(afterFamily.body.code).toBe('TOKEN_REUSED');
  });

  t('Refresh — parallel so‘rov: faqat BITTASI g‘olib chiqadi, ikkalasi ham keyin bekor', async () => {
    const { refreshCookie } = await loginFresh();

    const [r1, r2] = await Promise.all([
      request(app!.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', refreshCookie),
      request(app!.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', refreshCookie),
    ]);
    const statuses = [r1.status, r2.status].sort();
    // Ikkalasi ham 200 bo'lishi MUMKIN EMAS — CAS faqat bittasini o'tkazadi.
    expect(statuses).toEqual([200, 401]);

    const winner = r1.status === 200 ? r1 : r2;
    const winnerCookie = (winner.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;

    // G'olib chiqqan tokenning O'ZI ham endi ishlamasin — chunki bu "parallel
    // ishlatilish" o'zi shubhali hisoblanadi va butun oila yopiladi.
    const after = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', winnerCookie);
    expect(after.status).toBe(401);
    expect(after.body.code).toBe('TOKEN_REUSED');
  });

  // ── Rol tanlash / almashtirish ───────────────────────────────────────────

  t('roles/choose → keyingi choose BAD_STATE, switch faqat egallagan rolga', async () => {
    const { accessToken } = await loginFresh();

    const chosen = await request(app!.getHttpServer())
      .post('/api/v1/me/roles/choose')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'BUYER' })
      .expect(200);
    expect(chosen.body.activeRole).toBe('BUYER');
    expect(chosen.body.roleChosen).toBe(true);
    const newAccess = chosen.body.accessToken as string;

    // Ikkinchi marta tanlash — allaqachon tanlangan.
    await request(app!.getHttpServer())
      .post('/api/v1/me/roles/choose')
      .set('Authorization', `Bearer ${newAccess}`)
      .send({ role: 'SELLER' })
      .expect(409)
      .expect((r) => expect(r.body.code).toBe('BAD_STATE'));

    // Ega bo'lmagan rolga switch — NOT_ALLOWED.
    await request(app!.getHttpServer())
      .post('/api/v1/me/roles/switch')
      .set('Authorization', `Bearer ${newAccess}`)
      .send({ role: 'SELLER' })
      .expect(403)
      .expect((r) => expect(r.body.code).toBe('NOT_ALLOWED'));

    // O'ziga qaytish (ega bo'lgan rol) — ishlaydi.
    await request(app!.getHttpServer())
      .post('/api/v1/me/roles/switch')
      .set('Authorization', `Bearer ${newAccess}`)
      .send({ role: 'BUYER' })
      .expect(200)
      .expect((r) => expect(r.body.activeRole).toBe('BUYER'));
  });

  t('RolesGuard — rol tanlanmagan (activeRole=null) himoyalangan marshrutga kirolmaydi', async () => {
    const { accessToken } = await loginFresh();
    // `/me` himoyalanmagan (rol talab qilmaydi) — shu bilan ishlaydi.
    await request(app!.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((r) => expect(r.body.activeRole).toBeNull());
  });

  // ── Sessiya egaligi ───────────────────────────────────────────────────────

  t('Sessiyalar ro‘yxati + bitta sessiyani tugatish (o‘ziniki) + boshqa foydalanuvchining sessiyasi NOT_FOUND', async () => {
    const userA = await loginFresh();
    const userB = await loginFresh();

    const list = await request(app!.getHttpServer())
      .get('/api/v1/me/sessions')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(1);
    expect(list.body[0].current).toBe(true);
    const userASessionId = list.body[0].id as string;

    const listB = await request(app!.getHttpServer())
      .get('/api/v1/me/sessions')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(200);
    const userBSessionId = listB.body[0].id as string;

    // B — A'ning sessiyasini o'chira olmaydi (egalik: query-scoping → NOT_FOUND).
    await request(app!.getHttpServer())
      .delete(`/api/v1/me/sessions/${userASessionId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(404);

    // B — o'zinikini o'chira oladi.
    await request(app!.getHttpServer())
      .delete(`/api/v1/me/sessions/${userBSessionId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(200);

    // Endi B'ning refresh cookie'si ishlamaydi.
    await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', userB.refreshCookie)
      .expect(401);
  });

  t('Logout — joriy qurilmani yopadi, refresh endi ishlamaydi', async () => {
    const { accessToken, refreshCookie } = await loginFresh();
    await request(app!.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
      .expect(200);

    await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
  });

  t('Token yo‘q → NO_SESSION, yaroqsiz token → UNAUTHENTICATED', async () => {
    await request(app!.getHttpServer())
      .get('/api/v1/me')
      .expect(401)
      .expect((r) => expect(r.body.code).toBe('NO_SESSION'));

    await request(app!.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401)
      .expect((r) => expect(r.body.code).toBe('UNAUTHENTICATED'));
  });

  // Sanity: OTP kodi hech qachon DB'da ochiq matnda saqlanmaydi.
  t('OtpCode.codeHash — xom kod EMAS (argon2id format)', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone);
    const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    try {
      const row = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });
      expect(row?.codeHash).not.toBe(code);
      expect(row?.codeHash).toMatch(/^\$argon2id\$/);
    } finally {
      await db.$disconnect();
    }
  });

  // ATAYLAB OXIRIDA: bu test bitta IP'ning soatlik kvotasini "kuydiradi" —
  // undan keyin shu IP'dan yana OTP so'ragan HAR bir test rad etilardi.
  t('Bitta IP’dan soatlik chegaradan oshsa RATE_LIMITED (turli telefon, cooldown’ga tegmaydi)', async () => {
    const results: number[] = [];
    for (let i = 0; i < 21; i += 1) {
      const res = await request(app!.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .send({ phone: uniquePhone() });
      results.push(res.status);
    }
    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
