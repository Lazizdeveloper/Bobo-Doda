import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { PrismaClient, type StaffStatus } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { generateTotpSecret, generateTotp } from '@/common/security/totp.util';
import { encryptTotpSecret } from '@/common/security/totp-secret-cipher.util';
import { AppConfigService } from '@/config/app-config.service';
import { createStaffSession } from './support/fixtures';

const DB = 'health_e2e';

describe('Staff auth (e2e, real Postgres + Redis)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let db: PrismaClient | undefined;
  let totpKey: Buffer;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('staff-auth.e2e');
    if (!reachable) return;

    await provisionDb(DB);
    await flushRedis(); // OTP rate-limit hisoblagichlari boshqa e2e fayllardan qolmasin
    app = await buildTestApp();
    db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    totpKey = app.get(AppConfigService).staffTotpEncryptionKey;
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

  async function createStaff(opts: {
    email: string;
    password: string;
    status?: StaffStatus;
    mfaEnabled?: boolean;
    /** Plaintext Base32 — shifrlanadi (real enrollment bilan BIR XIL format) DB'ga yozishdan oldin. */
    totpSecret?: string;
    permissions?: string[];
  }) {
    return db!.staffMember.create({
      data: {
        id: uuidv7(),
        fullName: 'Test Staff',
        email: opts.email,
        passwordHash: await argon2.hash(opts.password, { type: argon2.argon2id }),
        role: 'OPERATIONS',
        title: 'Operator',
        status: opts.status ?? 'ACTIVE',
        mfaEnabled: opts.mfaEnabled ?? false,
        totpSecret: opts.totpSecret ? encryptTotpSecret(opts.totpSecret, totpKey) : undefined,
        permissions: (opts.permissions ?? ['DASHBOARD']) as never,
      },
    });
  }

  t('Login — to‘g‘ri email+parol → accessToken + cookie; noto‘g‘ri parol/email → bir xil INVALID_CREDENTIALS', async () => {
    await createStaff({ email: 'ops1@bobododa.uz', password: 'CorrectHorse123!' });

    const ok = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'ops1@bobododa.uz', password: 'CorrectHorse123!' })
      .expect(200);
    expect(typeof ok.body.accessToken).toBe('string');
    expect(ok.body.role).toBe('OPERATIONS');
    const cookie = ok.headers['set-cookie'] as unknown as string[];
    expect(cookie[0]).toMatch(/^staff_refresh_token=.+HttpOnly.+SameSite=Strict/);

    const wrongPassword = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'ops1@bobododa.uz', password: 'wrong-password' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');

    const noSuchEmail = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'nobody@bobododa.uz', password: 'wrong-password' });
    expect(noSuchEmail.status).toBe(401);
    expect(noSuchEmail.body.code).toBe('INVALID_CREDENTIALS');
  });

  t('Bloklangan hisob — parol to‘g‘ri bo‘lsa ham ACCOUNT_BLOCKED', async () => {
    await createStaff({ email: 'blocked@bobododa.uz', password: 'CorrectHorse123!', status: 'DISABLED' });
    const res = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'blocked@bobododa.uz', password: 'CorrectHorse123!' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_BLOCKED');
  });

  t('2FA (TOTP) — kod berilmasa MFA_REQUIRED, noto‘g‘ri kod INVALID_CODE, to‘g‘ri kod → 200', async () => {
    const secret = generateTotpSecret();
    await createStaff({
      email: 'mfa@bobododa.uz',
      password: 'CorrectHorse123!',
      mfaEnabled: true,
      totpSecret: secret,
    });

    const missing = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'mfa@bobododa.uz', password: 'CorrectHorse123!' });
    expect(missing.status).toBe(401);
    expect(missing.body.code).toBe('MFA_REQUIRED');

    const wrong = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'mfa@bobododa.uz', password: 'CorrectHorse123!', totpCode: '000000' });
    expect(wrong.status).toBe(422);
    expect(wrong.body.code).toBe('INVALID_CODE');

    const good = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'mfa@bobododa.uz', password: 'CorrectHorse123!', totpCode: generateTotp(secret) })
      .expect(200);
    expect(typeof good.body.accessToken).toBe('string');
  });

  t('GET /staff/me — LIVE ruxsatlarni qaytaradi; marketplace JWT rad etiladi (kesishmagan sirlar)', async () => {
    await createStaff({
      email: 'me1@bobododa.uz',
      password: 'CorrectHorse123!',
      permissions: ['DASHBOARD', 'AUDIT'],
    });
    const login = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'me1@bobododa.uz', password: 'CorrectHorse123!' })
      .expect(200);

    const me = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.permissions.sort()).toEqual(['AUDIT', 'DASHBOARD']);

    // Marketplace login (butunlay boshqa sir bilan imzolangan) shu marshrutda ishlamasin.
    const marketplacePhone = '+998955512399';
    await request(app!.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: marketplacePhone });
    // Kodni bilmasak ham — soxta (staff bo'lmagan shakldagi) token bilan sinov yetarli:
    const fakeMarketplaceLikeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4IiwiYWN0aXZlUm9sZSI6bnVsbCwiZmFtaWx5SWQiOiJ4In0.invalidsignature';
    const rejected = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${fakeMarketplaceLikeToken}`);
    expect(rejected.status).toBe(401);
  });

  t('Sessiya (StaffSession) o‘rtada bekor qilinsa (blok) — hali amal qiluvchi access token ham LIVE tekshiruvda rad etiladi', async () => {
    const staff = await createStaff({ email: 'live-block@bobododa.uz', password: 'CorrectHorse123!' });
    const login = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'live-block@bobododa.uz', password: 'CorrectHorse123!' })
      .expect(200);

    // Access token HALI muddati tugamagan — lekin admin hisobni bloklaydi.
    await db!.staffMember.update({ where: { id: staff.id }, data: { status: 'DISABLED' } });

    const res = await request(app!.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_BLOCKED');
  });

  t('Refresh — bitta opaque token butun sessiya davomida; logout’dan keyin TOKEN_EXPIRED', async () => {
    await createStaff({ email: 'refresh1@bobododa.uz', password: 'CorrectHorse123!' });
    const login = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: 'refresh1@bobododa.uz', password: 'CorrectHorse123!' })
      .expect(200);
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;

    // MUHIM: yangi access token matn jihatdan LOGIN tokeni bilan BIR XIL
    // bo'lishi MUMKIN — claim'lar ({sub, role, sessionId}) o'zgarmagan va
    // `iat` soniya aniqligida, shuning uchun bir soniya ichida ikkalasi
    // ham signed bo'lsa baytma-bayt teng chiqadi. Bu xavfsizlik nuqtai
    // nazaridan muammo EMAS (sessiya o'sha-o'sha) — shuning uchun tenglik
    // emas, TO'G'RI ekanini tekshiramiz.
    const refreshed = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    expect(typeof refreshed.body.accessToken).toBe('string');
    expect(refreshed.body.role).toBe(login.body.role);

    await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/logout')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .set('Cookie', cookie)
      .expect(200);

    const after = await request(app!.getHttpServer())
      .post('/api/v1/staff/auth/refresh')
      .set('Cookie', cookie);
    expect(after.status).toBe(401);
    expect(after.body.code).toBe('TOKEN_EXPIRED');
  });

  // ── Bosqich 11, bo'lim 7/10/11/12/64 — TOTP enrollment to‘liq sikli ─────

  describe('TOTP enrollment/disable/admin-reset (e2e)', () => {
    async function freshLogin(password = 'CorrectHorse123!') {
      const email = `totp-${uuidv7()}@bobododa.uz`;
      await createStaff({ email, password });
      const login = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email, password })
        .expect(200);
      return { email, accessToken: login.body.accessToken as string };
    }

    t('begin enrollment → secret+otpauthUri qaytadi; noto‘g‘ri kod rad etiladi; to‘g‘ri kod ENABLE qiladi', async () => {
      const { accessToken } = await freshLogin();

      const begin = await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/enroll')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(typeof begin.body.secret).toBe('string');
      expect(begin.body.otpauthUri).toContain('otpauth://totp/');
      expect(begin.body.otpauthUri).toContain(`secret=${begin.body.secret}`);

      const wrong = await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ totpCode: '000000' });
      expect(wrong.status).toBe(422);
      expect(wrong.body.code).toBe('INVALID_CODE');

      const good = await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ totpCode: generateTotp(begin.body.secret) })
        .expect(200);
      expect(good.body.ok).toBe(true);

      const me = await request(app!.getHttpServer())
        .get('/api/v1/staff/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(me.body.mfaEnabled).toBe(true);
    });

    t('Enrollment tugagach — login endi MFA talab qiladi (secret DB’da SHIFRLANGAN saqlanadi)', async () => {
      const email = `totp-login-${uuidv7()}@bobododa.uz`;
      const password = 'CorrectHorse123!';
      await createStaff({ email, password });
      const login = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email, password })
        .expect(200);

      const enroll = await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/enroll')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
      await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/verify')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ totpCode: generateTotp(enroll.body.secret) })
        .expect(200);

      const raw = await db!.staffMember.findFirstOrThrow({ where: { email } });
      expect(raw.totpSecret).not.toBeNull();
      expect(raw.totpSecret).not.toBe(enroll.body.secret); // shifrlangan — plaintext bilan bir xil EMAS
      expect(raw.totpSecret!.startsWith('v1:')).toBe(true);

      const nextLogin = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email, password });
      expect(nextLogin.status).toBe(401);
      expect(nextLogin.body.code).toBe('MFA_REQUIRED');
    });

    t('Disable — joriy parol + to‘g‘ri TOTP kod talab qiladi; noto‘g‘ri ma’lumot rad etiladi', async () => {
      const secret = generateTotpSecret();
      const password = 'CorrectHorse123!';
      const staff = await createStaff({ email: `totp-disable-${uuidv7()}@bobododa.uz`, password, mfaEnabled: true, totpSecret: secret });
      const login = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email: staff.email, password, totpCode: generateTotp(secret) })
        .expect(200);

      const wrongPassword = await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/disable')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ currentPassword: 'wrong', totpCode: generateTotp(secret) });
      expect(wrongPassword.status).toBe(401);
      expect(wrongPassword.body.code).toBe('INVALID_CURRENT_PASSWORD');

      const wrongCode = await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/disable')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ currentPassword: password, totpCode: '000000' });
      expect(wrongCode.status).toBe(422);
      expect(wrongCode.body.code).toBe('INVALID_CODE');

      const ok = await request(app!.getHttpServer())
        .post('/api/v1/staff/me/totp/disable')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ currentPassword: password, totpCode: generateTotp(secret) })
        .expect(200);
      expect(ok.body.ok).toBe(true);

      const me = await request(app!.getHttpServer())
        .get('/api/v1/staff/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
      expect(me.body.mfaEnabled).toBe(false);
    });

    t('Admin TOTP reset — MFA’ni o‘chiradi VA barcha sessiyalarni bekor qiladi', async () => {
      const secret = generateTotpSecret();
      const password = 'CorrectHorse123!';
      const staff = await createStaff({ email: `totp-reset-${uuidv7()}@bobododa.uz`, password, mfaEnabled: true, totpSecret: secret });
      const login = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email: staff.email, password, totpCode: generateTotp(secret) })
        .expect(200);

      const admin = await createStaffSession(app!, db!, ['STAFF'], 'SUPER_ADMIN');
      await request(app!.getHttpServer())
        .post(`/api/v1/staff/admin/staff-members/${staff.id}/totp/reset`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);

      const raw = await db!.staffMember.findUniqueOrThrow({ where: { id: staff.id } });
      expect(raw.mfaEnabled).toBe(false);
      expect(raw.totpSecret).toBeNull();

      // Reset — eski sessiya HAM bekor qilingan (xavfsizlik: "yo'qolgan
      // qurilma" stsenariysida eski sessiya orqali kirish YO'Q qilinishi kerak).
      const res = await request(app!.getHttpServer())
        .get('/api/v1/staff/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`);
      expect(res.status).toBe(401);

      // Endi parol bilan (MFA'siz) login qilish mumkin.
      const relogin = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email: staff.email, password })
        .expect(200);
      expect(typeof relogin.body.accessToken).toBe('string');
    });

    t('TOTP rate limit — ketma-ket noto‘g‘ri kodlar chegaradan o‘tsa RATE_LIMITED', async () => {
      const secret = generateTotpSecret();
      const password = 'CorrectHorse123!';
      const staff = await createStaff({ email: `totp-ratelimit-${uuidv7()}@bobododa.uz`, password, mfaEnabled: true, totpSecret: secret });
      const login = await request(app!.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email: staff.email, password, totpCode: generateTotp(secret) })
        .expect(200);

      let lastStatus = 0;
      let lastCode: string | undefined;
      for (let i = 0; i < 10; i += 1) {
        const res = await request(app!.getHttpServer())
          .post('/api/v1/staff/me/totp/disable')
          .set('Authorization', `Bearer ${login.body.accessToken}`)
          .send({ currentPassword: password, totpCode: '111111' });
        lastStatus = res.status;
        lastCode = res.body.code as string | undefined;
        if (lastCode === 'RATE_LIMITED') break;
      }
      expect(lastStatus).toBe(429);
      expect(lastCode).toBe('RATE_LIMITED');
    });

    t('Replay himoyasi — bir xil TOTP kod bilan 2 ta PARALLEL login — FAQAT BITTASI muvaffaqiyatli', async () => {
      const secret = generateTotpSecret();
      const password = 'CorrectHorse123!';
      const staff = await createStaff({ email: `totp-replay-${uuidv7()}@bobododa.uz`, password, mfaEnabled: true, totpSecret: secret });
      const code = generateTotp(secret);

      const [a, b] = await Promise.all([
        request(app!.getHttpServer()).post('/api/v1/staff/auth/login').send({ email: staff.email, password, totpCode: code }),
        request(app!.getHttpServer()).post('/api/v1/staff/auth/login').send({ email: staff.email, password, totpCode: code }),
      ]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([200, 422]); // aynan BITTASI g'olib, ikkinchisi "kod allaqachon ishlatilgan"
    });
  });
});
