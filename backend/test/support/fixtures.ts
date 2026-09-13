import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { PrismaClient, type StaffPermission, type StaffRole } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import { waitFor } from './wait-for';
import type { SmsProvider, SmsSendResult } from '@/infra/sms/sms-provider.interface';

/** `SMS_PROVIDER`ni almashtiruvchi test dubli — OTP kodi argon2id hash bo'lgani uchun DB'dan qayta o'qib bo'lmaydi. */
export class CapturingSmsProvider implements SmsProvider {
  lastCode: string | undefined;
  lastPhone: string | undefined;

  async send(phone: string, _template: string, params: Record<string, string>): Promise<SmsSendResult> {
    this.lastPhone = phone;
    this.lastCode = params.code;
    return { success: true, providerMessageId: `test-${Date.now()}` };
  }
}

let phoneCounter = 0;
/**
 * Har chaqiruvda haqiqatan noyob (UZ mobil formatida valid) raqam.
 *
 * ATAYLAB faqat monoton hisoblagichdan — `Date.now()`ga TAYANMAYDI. Avvalgi
 * versiya millisekund ichida bir necha marta chaqirilganda (in-process HTTP,
 * haqiqiy tarmoq kechikishisiz — bu yerda odatiy holat) BIR XIL raqamni
 * ikki marta qaytarib qo'yardi, ya'ni ikkita "yangi" test foydalanuvchisi
 * aslida BITTA haqiqiy `User` qatoriga to'g'ri kelardi (2-marta login —
 * `isNewUser: false`, eski `roleChosen`/`sellerStatus` bilan) — bu xato
 * boshqa testlarda tushunarsiz `SELLER_APPLICATION_ALREADY_PENDING`/
 * `BAD_STATE` xatolariga olib kelgan edi.
 */
export function uniquePhone(): string {
  phoneCounter += 1;
  // "+998" + "90" + 7 xonali hisoblagich — 9,999,999 tagacha kafolatlangan
  // noyoblik (bitta test fayli ishlatishi mumkin bo'lganidan ancha ko'p).
  return `+99890${phoneCounter.toString().padStart(7, '0')}`;
}

export interface UserSession {
  userId: string;
  accessToken: string;
}

/** OTP orqali yangi marketplace foydalanuvchi yaratadi va (ixtiyoriy) rolni tanlaydi. */
export async function loginNewUser(
  app: INestApplication,
  sms: CapturingSmsProvider,
  role?: 'BUYER' | 'SELLER',
): Promise<UserSession> {
  const phone = uniquePhone();
  await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone }).expect(200);
  await waitFor(() => sms.lastPhone === phone && !!sms.lastCode, { label: 'otp sms' });
  const verify = await request(app.getHttpServer())
    .post('/api/v1/auth/otp/verify')
    .send({ phone, code: sms.lastCode })
    .expect(200);
  let accessToken = verify.body.accessToken as string;
  let userId = '';
  {
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    userId = me.body.id;
  }
  if (role) {
    const chosen = await request(app.getHttpServer())
      .post('/api/v1/me/roles/choose')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role })
      .expect(200);
    accessToken = chosen.body.accessToken;
  }
  return { userId, accessToken };
}

export interface StaffSession {
  staffId: string;
  accessToken: string;
}

/** Staff hisobini to'g'ridan-to'g'ri DB'ga yozadi (Phase 2 pattern), keyin haqiqiy login orqali token oladi. */
export async function createStaffSession(
  app: INestApplication,
  db: PrismaClient,
  permissions: StaffPermission[],
  // Bosqich 11 — ixtiyoriy: `@RequireRole('SUPER_ADMIN')` bilan himoyalangan
  // endpointlarni sinash uchun. Sukut `OPERATIONS` — MAVJUD barcha chaqiruv
  // joylari o'zgarishsiz ishlaydi.
  role: StaffRole = 'OPERATIONS',
): Promise<StaffSession> {
  const email = `staff-${uuidv7()}@bobododa.uz`;
  const password = 'SuperSecret123!';
  const staff = await db.staffMember.create({
    data: {
      id: uuidv7(),
      fullName: 'Test Staff',
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role,
      title: 'Operator',
      permissions,
    },
  });
  const login = await request(app.getHttpServer())
    .post('/api/v1/staff/auth/login')
    .send({ email, password })
    .expect(200);
  return { staffId: staff.id, accessToken: login.body.accessToken };
}

export async function createCategory(app: INestApplication, staffToken: string, slug: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/staff/categories')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ slug, nameUz: slug, nameRu: slug, nameEn: slug })
    .expect(200);
  return res.body.id;
}

/** To'liq oqim: OTP login → SELLER rol → ariza → staff tasdig'i → APPROVED seller. */
export async function createApprovedSeller(
  app: INestApplication,
  sms: CapturingSmsProvider,
  kycStaffToken: string,
): Promise<UserSession> {
  const session = await loginNewUser(app, sms, 'SELLER');
  const applied = await request(app.getHttpServer())
    .post('/api/v1/me/seller-application')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send({ legalName: 'Legal Name', displayName: 'Display Name' })
    .expect(200);
  await request(app.getHttpServer())
    .post(`/api/v1/staff/seller-applications/${applied.body.id}/approve`)
    .set('Authorization', `Bearer ${kycStaffToken}`)
    .expect(200);
  return session;
}

export function freshDb(): PrismaClient {
  return new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
}

export interface ActiveServiceFixture {
  serviceId: string;
  priceSom: number;
  seller: UserSession;
  categoryId: string;
}

/**
 * Bosqich 4 uchun — to'liq oqim: APPROVED seller + kategoriya + ACTIVE
 * xizmat (submit + staff approve). `staffToken` egasi `KYC`+`CATEGORIES`+
 * `SERVICES` huquqlarining hammasiga ega bo'lishi kerak.
 */
export async function createActiveService(
  app: INestApplication,
  sms: CapturingSmsProvider,
  staffToken: string,
  opts?: { priceSom?: number; categorySlug?: string },
): Promise<ActiveServiceFixture> {
  const seller = await createApprovedSeller(app, sms, staffToken);
  const categoryId = await createCategory(app, staffToken, opts?.categorySlug ?? `cat-${uuidv7()}`);
  const priceSom = opts?.priceSom ?? 900_000;

  const svc = await request(app.getHttpServer())
    .post('/api/v1/seller/services')
    .set('Authorization', `Bearer ${seller.accessToken}`)
    .send({
      categoryId,
      title: 'Fixture xizmat nomi',
      description: 'x'.repeat(25),
      price: priceSom,
      deliveryDays: 3,
    })
    .expect(200);
  const serviceId = svc.body.id as string;

  await request(app.getHttpServer())
    .post(`/api/v1/seller/services/${serviceId}/submit`)
    .set('Authorization', `Bearer ${seller.accessToken}`)
    .expect(200);
  await request(app.getHttpServer())
    .post(`/api/v1/staff/services/${serviceId}/approve`)
    .set('Authorization', `Bearer ${staffToken}`)
    .expect(200);

  return { serviceId, priceSom, seller, categoryId };
}

/** Kelajakdagi ISO sana — `deadline` DTO maydoni uchun. */
export function futureIsoDate(daysFromNow = 90): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}
