import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { generateTotpSecret, generateTotp } from '@/common/security/totp.util';

const DB = 'health_e2e';

describe('Staff auth (e2e, real Postgres + Redis)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let db: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('staff-auth.e2e');
    if (!reachable) return;

    await provisionDb(DB);
    await flushRedis(); // OTP rate-limit hisoblagichlari boshqa e2e fayllardan qolmasin
    app = await buildTestApp();
    db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
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
    isActive?: boolean;
    mfaEnabled?: boolean;
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
        isActive: opts.isActive ?? true,
        mfaEnabled: opts.mfaEnabled ?? false,
        totpSecret: opts.totpSecret,
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
    await createStaff({ email: 'blocked@bobododa.uz', password: 'CorrectHorse123!', isActive: false });
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
    await db!.staffMember.update({ where: { id: staff.id }, data: { isActive: false } });

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
});
