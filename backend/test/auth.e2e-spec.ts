import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { waitFor } from './support/wait-for';
import { SMS_PROVIDER, type SmsProvider, type SmsSendResult } from '@/infra/sms/sms-provider.interface';
import { RedisService } from '@/infra/redis/redis.service';

/**
 * Bosqich 2 — marketplace OTP auth + refresh rotatsiya/reuse-detection +
 * rol tanlash/almashtirish + sessiya boshqaruvi (e2e, real Postgres + Redis
 * + BullMQ). Bosqich 20 — LOGIN va REGISTER alohida niyat (`intent`):
 * LOGIN hech qachon User yaratmaydi, REGISTER hech qachon mavjud
 * telefonga ustidan yozmaydi. `SMS_PROVIDER` — `CapturingSmsProvider`
 * bilan almashtiriladi (haqiqiy kodni argon2id orqali DB'dan qayta
 * o'qib bo'lmaydi — faqat "yuborilgan" nusxadan bilamiz, xuddi haqiqiy
 * SMS provayder logidan tekshirganday).
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

  async function requestAndGetCode(phone: string, intent: 'LOGIN' | 'REGISTER'): Promise<string> {
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone, intent })
      .expect(200, { sent: true });
    await waitFor(() => sms.lastPhone === phone && !!sms.lastCode, { label: 'otp sms' });
    return sms.lastCode!;
  }

  /** Yangi telefon uchun to'liq REGISTER oqimi — pastdagi testlarning
      ko'pchiligiga "menga shunchaki autentifikatsiyalangan sessiya kerak"
      degan holatni ta'minlaydi (refresh rotatsiya, rol tanlash va h.k.
      LOGIN/REGISTER farqiga bog'liq emas). */
  async function registerFresh(): Promise<{ accessToken: string; refreshCookie: string; phone: string }> {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone, 'REGISTER');
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'REGISTER' })
      .expect(200);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const refreshCookie = setCookie[0]!.split(';')[0]!;
    return { accessToken: res.body.accessToken, refreshCookie, phone };
  }

  async function userCount(phone: string): Promise<number> {
    const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    try {
      return await db.user.count({ where: { phone } });
    } finally {
      await db.$disconnect();
    }
  }

  // ── REGISTER — yagona User yaratish yo'li ────────────────────────────────

  t('REGISTER: yangi telefon → User yaratiladi, activeRole=null, refresh cookie', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone, 'REGISTER');

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'REGISTER' })
      .expect(200);

    expect(res.body.isNewUser).toBe(true);
    expect(res.body.activeRole).toBeNull();
    expect(res.body.roleChosen).toBe(false);
    expect(typeof res.body.accessToken).toBe('string');
    const cookie = res.headers['set-cookie'];
    expect(cookie?.[0]).toMatch(/^refresh_token=.+HttpOnly.+SameSite=Strict/);
    expect(await userCount(phone)).toBe(1);
  });

  t('REGISTER: allaqachon ro‘yxatdan o‘tgan telefon → PHONE_EXISTS, YANGI User yaratilmaydi', async () => {
    const { phone } = await registerFresh();
    expect(await userCount(phone)).toBe(1);

    // `registerFresh()` shu telefon+REGISTER uchun cooldown'ni ALLAQACHON
    // ishlatgan (bir necha millisekund oldin) — real 60s kutmasdan yana
    // so'rash uchun tozalaymiz (production'da foydalanuvchi haqiqatan
    // 60s kutgan bo'lardi, testda vaqt real emas).
    await flushCooldownOnly();
    const code = await requestAndGetCode(phone, 'REGISTER');
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'REGISTER' })
      .expect(409)
      .expect((r) => expect(r.body.code).toBe('PHONE_EXISTS'));

    expect(await userCount(phone)).toBe(1); // dublikat yo'q
  });

  // ── LOGIN — faqat MAVJUD hisobni autentifikatsiya qiladi ─────────────────

  t('LOGIN: mavjud telefon → sessiya (isNewUser=false), User qayta yaratilmaydi', async () => {
    const { phone } = await registerFresh();

    const code = await requestAndGetCode(phone, 'LOGIN');
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'LOGIN' })
      .expect(200);

    expect(res.body.isNewUser).toBe(false);
    expect(typeof res.body.accessToken).toBe('string');
    expect(await userCount(phone)).toBe(1);
  });

  t('LOGIN: mavjud bo‘lmagan telefon → USER_NOT_FOUND, User YARATILMAYDI', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone, 'LOGIN');

    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'LOGIN' })
      .expect(404)
      .expect((r) => expect(r.body.code).toBe('USER_NOT_FOUND'));

    expect(await userCount(phone)).toBe(0); // ATAYLAB avto-create YO'Q
  });

  // ── Intent binding — LOGIN OTP != REGISTER OTP context ───────────────────

  t('Intent binding: LOGIN uchun so‘ralgan kod REGISTER verify’da ishlamaydi', async () => {
    const { phone } = await registerFresh();
    const loginCode = await requestAndGetCode(phone, 'LOGIN');

    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: loginCode, intent: 'REGISTER' })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('INVALID_CODE'));

    // O'ziniki intent bilan hali ham yaroqli — challenge INTENT bo'yicha
    // FARQLANADI, kod umuman "yonib ketgan" emas.
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: loginCode, intent: 'LOGIN' })
      .expect(200);
  });

  t('Intent binding: REGISTER uchun so‘ralgan kod LOGIN verify’da ishlamaydi', async () => {
    const phone = uniquePhone();
    const registerCode = await requestAndGetCode(phone, 'REGISTER');

    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: registerCode, intent: 'LOGIN' })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('INVALID_CODE'));
    expect(await userCount(phone)).toBe(0); // LOGIN urinishi User yaratmagan

    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: registerCode, intent: 'REGISTER' })
      .expect(200);
  });

  // ── Concurrency — DB unique constraint YAGONA haqiqat manbai ─────────────

  /**
   * Bitta haqiqiy kod, 10 ta chinakam PARALLEL (double-submit/retry-storm)
   * HTTP so'rov — real dunyoda "tugmani ikki marta bosish" yoki tarmoq
   * qayta urinishi. `OtpService.verifyOtp`ning CAS (`updateMany WHERE
   * consumedAt: null`)i FAQAT bitta so'rovni "iste'mol qilishga" o'tkazadi
   * — qolgan 9tasi hech qachon `User.create()`ga yetib bormaydi. Bu
   * User-yaratish darajasidagi DB unique constraint'ning O'ZI emas
   * (o'sha shoxobcha — `AuthService.register`dagi `P2002` ushlash —
   * `auth.service.spec.ts`da FAKE Prisma bilan alohida sinaladi, chunki
   * OTP single-use himoyasi allaqachon bir xil kodni ikkinchi marta
   * `create()`ga yetkazib bermaydi — DB unique constraint shu bilan
   * birga IKKINCHI qatlam himoya). Bu yerdagi muhim invariant —
   * FOYDALANUVCHIGA ko'rinadigan natija: 10 ta parallel urinish HAM
   * FAQAT bitta User yaratadi.
   */
  t('REGISTER: bir xil kod bilan 10 ta parallel verify → FAQAT bitta User yaratiladi', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone, 'REGISTER');

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app!.getHttpServer())
          .post('/api/v1/auth/otp/verify')
          .send({ phone, code, intent: 'REGISTER' }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 200);
    expect(succeeded.length).toBe(1);
    expect(await userCount(phone)).toBe(1);
  });

  // ── Enumeration himoyasi ─────────────────────────────────────────────────

  t('Ro‘yxatdan o‘tmagan/o‘tgan telefon uchun /otp/request bir xil javob qaytaradi (enumeration himoyasi)', async () => {
    const unregistered = uniquePhone();
    const res1 = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: unregistered, intent: 'LOGIN' });
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({ sent: true });

    const res2 = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: unregistered, intent: 'REGISTER' });
    expect(res2.status).toBe(200);
    expect(res2.body).toEqual({ sent: true });
  });

  t('Noto‘g‘ri kod 5 marta → kod “kuyadi”, keyin TO‘G‘RI kod ham ishlamaydi', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone, 'REGISTER');
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      await request(app!.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code: wrong, intent: 'REGISTER' })
        .expect(422)
        .expect((r) => expect(r.body.code).toBe('INVALID_CODE'));
    }

    // Kod kuygan — endi TO'G'RI kod ham rad etiladi.
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'REGISTER' })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('INVALID_CODE'));
  });

  t('Muddati tugagan kod rad etiladi (expiresAt o‘tmishga suriladi)', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone, 'REGISTER');

    const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    try {
      await db.otpCode.updateMany({
        where: { phone, intent: 'REGISTER', consumedAt: null },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
    } finally {
      await db.$disconnect();
    }

    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'REGISTER' })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('INVALID_CODE'));
  });

  t('Bir marta ishlatilgan kod ikkinchi marta rad etiladi (single-use)', async () => {
    const phone = uniquePhone();
    const code = await requestAndGetCode(phone, 'REGISTER');

    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'REGISTER' })
      .expect(200);

    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, intent: 'REGISTER' })
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

    const code = await requestAndGetCode(e164, 'REGISTER');
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: national, code, intent: 'REGISTER' }) // ATAYLAB milliy formatda — request'dan farqli
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

  t('OTP siyosati — /otp/request "channel" (email/telegram) maydonini qabul qilmaydi (whitelist rad etadi)', async () => {
    const phone = uniquePhone();
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone, intent: 'LOGIN', channel: 'email' })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('VALIDATION'));
  });

  t('Qayta so‘rash cooldown ichida RATE_LIMITED qaytaradi (bir xil intent)', async () => {
    const phone = uniquePhone();
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone, intent: 'LOGIN' })
      .expect(200);
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone, intent: 'LOGIN' });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });

  t('Cooldown INTENT bo‘yicha ajratilgan — LOGIN so‘ralgach darhol REGISTER so‘rash bloklanmaydi', async () => {
    // "Hisob topilmadi → Ro'yxatdan o'tish" CTA bosilgach foydalanuvchi
    // 60s kutmasdan REGISTER kodini olishi kerak (UX talabi) — lekin
    // kunlik/IP chegara baribir umumiy qoladi (pastdagi test).
    const phone = uniquePhone();
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone, intent: 'LOGIN' })
      .expect(200);
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone, intent: 'REGISTER' })
      .expect(200);
    await flushIpCounter(); // pastdagi testlar uchun umumiy IP byudjetini tiklaydi
  });

  t('Kunlik chegara INTENT’dan qat’iy nazar umumiy — LOGIN/REGISTER almashtirib bypass qilinmaydi', async () => {
    const phone = uniquePhone();
    const results: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const intent = i % 2 === 0 ? 'LOGIN' : 'REGISTER';
      const res = await request(app!.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .send({ phone, intent });
      results.push(res.status);
      await flushCooldownOnly(); // cooldown har safar 60s bo'lmasin — faqat kunlik hisoblagich sinaladi
    }
    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
    // Bu test 10 ta muvaffaqiyatli so'rov yuboradi — hammasi BIR XIL test
    // jarayoni IP'sidan, shuning uchun umumiy `otp:ip:*` hisoblagichini ham
    // oshiradi. Pastdagi (oxirgi, ATAYLAB IP kvotasini "kuydiruvchi") test
    // ANIQ 20 ta so'rovga tayanadi — shu sabab bu yerda tiklaymiz.
    await flushIpCounter();
  });

  /** Faqat cooldown kalitlarini tozalaydi (`ratelimit:cd:otp:cooldown:*`) —
      kunlik hisoblagich (`ratelimit:hit:otp:day:*`) TEGILMAYDI, aks holda
      kunlik chegara testi hech qachon 429'ga yetolmasdi (cooldown har
      safar oraliqda bo'lmasa, alternativ intent'lar bir-birini bloklab
      qo'yardi va daily counter'ga yetib bormasdan oldin cooldown 429
      chiqarardi — bu daily limit emas, boshqa narsani sinagan bo'lardi). */
  async function flushCooldownOnly(): Promise<void> {
    const redis = app!.get(RedisService).client;
    const keys = await redis.keys('ratelimit:cd:otp:cooldown:*');
    if (keys.length) await redis.del(...keys);
  }

  /** Faqat umumiy IP soatlik hisoblagichini (`ratelimit:hit:otp:ip:*`)
      tozalaydi — yuqoridagi ikki test (INTENT ajratilgan cooldown, kunlik
      chegara) BIR NECHTA muvaffaqiyatli `/otp/request` yuboradi, hammasi
      BIR XIL test-jarayoni IP'sidan. Bu ularning maqsadiga aloqasi yo'q
      yon ta'sir — tozalamasa, faylning OXIRIDAGI ATAYLAB IP kvotasini
      "kuydiruvchi" test (va undan oldingi boshqa har qanday test) noto'g'ri
      vaqtda 429 olardi. */
  async function flushIpCounter(): Promise<void> {
    const redis = app!.get(RedisService).client;
    const keys = await redis.keys('ratelimit:hit:otp:ip:*');
    if (keys.length) await redis.del(...keys);
  }

  // ── Refresh rotatsiya + reuse detection ──────────────────────────────────

  t('Refresh — rotatsiya: eski cookie qayta kelsa TOKEN_REUSED va butun oila bekor bo‘ladi', async () => {
    const { refreshCookie } = await registerFresh();

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
    const { refreshCookie } = await registerFresh();

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
    const { accessToken } = await registerFresh();

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
    const { accessToken } = await registerFresh();
    // `/me` himoyalanmagan (rol talab qilmaydi) — shu bilan ishlaydi.
    await request(app!.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((r) => expect(r.body.activeRole).toBeNull());
  });

  // ── Sessiya egaligi ───────────────────────────────────────────────────────

  t('Sessiyalar ro‘yxati + bitta sessiyani tugatish (o‘ziniki) + boshqa foydalanuvchining sessiyasi NOT_FOUND', async () => {
    const userA = await registerFresh();
    const userB = await registerFresh();

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
    const { accessToken, refreshCookie } = await registerFresh();
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
    const code = await requestAndGetCode(phone, 'REGISTER');
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
        .send({ phone: uniquePhone(), intent: 'LOGIN' });
      results.push(res.status);
    }
    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
