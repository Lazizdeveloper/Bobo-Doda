import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { CapturingSmsProvider, createStaffSession, freshDb, loginNewUser } from './support/fixtures';
import type { PrismaClient } from '@prisma/client';

const DB = 'health_e2e';

/** Bosqich 3 — profil tahriri + hisob holati (`User.status`) guard'i. */
describe('Profile & account status (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('profile-account.e2e');
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

  t('PATCH /me/profile — fullName yangilanadi, profileDone=true bo‘ladi', async () => {
    const session = await loginNewUser(app!, sms);
    const res = await request(app!.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fullName: '  Rustam Qosimov  ' })
      .expect(200);
    expect(res.body.fullName).toBe('Rustam Qosimov'); // trim qilingan
    expect(res.body.profileDone).toBe(true);
  });

  t('PATCH /me/profile — juda qisqa/bo‘sh ism VALIDATION bilan rad etiladi', async () => {
    const session = await loginNewUser(app!, sms);
    const res = await request(app!.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fullName: '   ' }); // trim'dan keyin bo'sh
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION');
  });

  t('PATCH /me/profile — noma’lum maydon whitelist orqali tashlanadi', async () => {
    const session = await loginNewUser(app!, sms);
    const res = await request(app!.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fullName: 'Valid Name', avatarKey: 'evil/../key', isAdmin: true });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION'); // forbidNonWhitelisted
  });

  t('Staff SUSPENDED qilsa — write bloklanadi (ACCOUNT_SUSPENDED), read ishlayveradi', async () => {
    const staff = await createStaffSession(app!, db!, ['USERS']);
    const session = await loginNewUser(app!, sms);

    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${session.userId}/suspend`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'test suspension over five chars' })
      .expect(200);

    const write = await request(app!.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fullName: 'Blocked write attempt' });
    expect(write.status).toBe(403);
    expect(write.body.code).toBe('ACCOUNT_SUSPENDED');

    const read = await request(app!.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(read.status).toBe(200);
    expect(read.body.status).toBe('SUSPENDED');
  });

  t('Staff BLOCKED qilsa — write bloklanadi (ACCOUNT_BLOCKED)', async () => {
    const staff = await createStaffSession(app!, db!, ['USERS']);
    const session = await loginNewUser(app!, sms);

    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${session.userId}/block`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'test block over five chars' })
      .expect(200);

    const write = await request(app!.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fullName: 'Should not work' });
    expect(write.status).toBe(403);
    expect(write.body.code).toBe('ACCOUNT_BLOCKED');
  });

  t('Reactivate — ACTIVE’ga qaytaradi, write yana ishlaydi', async () => {
    const staff = await createStaffSession(app!, db!, ['USERS']);
    const session = await loginNewUser(app!, sms);

    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${session.userId}/suspend`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'temporary suspension test' })
      .expect(200);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${session.userId}/reactivate`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);

    const write = await request(app!.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fullName: 'Works again' });
    expect(write.status).toBe(200);
  });

  t('Ikki marta suspend (staff xatosi) — INVALID_TRANSITION', async () => {
    const staff = await createStaffSession(app!, db!, ['USERS']);
    const session = await loginNewUser(app!, sms);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${session.userId}/suspend`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'first suspension test' })
      .expect(200);
    const second = await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${session.userId}/suspend`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'second suspension test' });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('INVALID_TRANSITION');
  });

  t('USERS huquqi bo‘lmagan staff — suspend qila olmaydi (FORBIDDEN)', async () => {
    const staff = await createStaffSession(app!, db!, ['SERVICES']);
    const session = await loginNewUser(app!, sms);
    const res = await request(app!.getHttpServer())
      .post(`/api/v1/staff/users/${session.userId}/suspend`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ reason: 'no permission test' });
    expect(res.status).toBe(403);
  });
});
