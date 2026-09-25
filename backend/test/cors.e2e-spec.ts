import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { dropDatabase, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { AppConfigService } from '@/config/app-config.service';

/**
 * Bo'lim 3 (admin.bobododa.uz ko'chirish) — security audit topilmasi 3a:
 * yagona umumiy CORS ro'yxat staff sessiyasiga HECH QANDAY real izolyatsiya
 * bermas edi — `app.bobododa.uz`da ishlaydigan har qanday skript
 * `credentials:'include'` bilan `/staff/auth/refresh`ni chaqirib, staff
 * access token'ini o'qiy olardi (SameSite=Strict sibling subdomenlardan
 * himoya qilmaydi). Bu test `main.ts`/`build-app.ts`dagi CORS delegate
 * `staff/*` va marketplace yo'llarini HAQIQATAN alohida ro'yxatdan
 * o'tkazishini tasdiqlaydi.
 *
 * `.env.e2e` lokal bitta umumiy host uchun ikkala ro'yxatga bir xil
 * qiymat beradi (haqiqiy admin/marketplace host bo'linishi yo'q) —
 * shuning uchun bu yerda IZOLYATSIYANI sinash uchun `AppConfigService`
 * getter'lari ataylab ikkita HAQIQIY, farqli ro'yxat bilan almashtiriladi.
 * Delegate har so'rovda `config`dan o'qiydi (`main.ts`), shuning uchun
 * bootstrap'dan keyin spy qo'yish ham xavfsiz.
 *
 * DB nomi ATAYLAB `health_e2e` — QA ko'rib chiqishida topilgan xato:
 * `jest-e2e.setup.ts` `DATABASE_URL`ni FAYL IMPORT vaqtida (barcha
 * spec'lar uchun BIR MARTA) `health_e2e`ga QATTIQ YOZIB QO'YADI —
 * `provisionDb()`ga qanday nom berilishidan qat'i nazar, ilova AYNAN
 * shu bazaga ulanadi. Boshqa nom (masalan avvalgi `cors_e2e`) berilsa,
 * `provisionDb` BOSHQA (ishlatilmaydigan) bazani yaratadi, ilova esa
 * `health_e2e`ga ulanishga urinadi — agar u hali boshqa spec tomonidan
 * yaratilmagan bo'lsa, `PrismaClientInitializationError` bilan yiqiladi.
 * Boshqa barcha e2e spec'lar (`health.e2e-spec.ts`, `staff-auth.e2e-spec.ts`
 * va h.k.) ham shu sababdan bir xil `health_e2e` nomini ishlatadi —
 * `--runInBand` ketma-ketligida har bir fayl uni provision/drop qiladi.
 */
describe('CORS isolation — staff/* vs marketplace (e2e, real Postgres + Redis)', () => {
  let app: INestApplication | undefined;
  let reachable = false;

  const MARKETPLACE_ORIGIN = 'https://app.bobododa.uz';
  const ADMIN_ORIGIN = 'https://admin.bobododa.uz';

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('cors.e2e');
    if (!reachable) return;

    await provisionDb('health_e2e');
    app = await buildTestApp();

    const config = app.get(AppConfigService);
    jest.spyOn(config, 'corsOrigins', 'get').mockReturnValue([MARKETPLACE_ORIGIN]);
    jest.spyOn(config, 'staffCorsOrigins', 'get').mockReturnValue([ADMIN_ORIGIN]);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (reachable) await dropDatabase('health_e2e');
  });

  const t = (name: string, fn: () => Promise<void>): void =>
    it(name, async () => {
      if (!reachable) return;
      await fn();
    });

  t('marketplace yo‘l (/auth/login): ruxsat etilgan marketplace origin qabul qilinadi', async () => {
    const res = await request(app!.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', MARKETPLACE_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBe(MARKETPLACE_ORIGIN);
  });

  t('marketplace yo‘l (/auth/login): admin origin RAD ETILADI', async () => {
    const res = await request(app!.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', ADMIN_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  t('staff yo‘l (/staff/auth/refresh): ruxsat etilgan admin origin qabul qilinadi', async () => {
    const res = await request(app!.getHttpServer())
      .options('/api/v1/staff/auth/refresh')
      .set('Origin', ADMIN_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBe(ADMIN_ORIGIN);
  });

  t(
    'staff yo‘l (/staff/auth/refresh): marketplace origin RAD ETILADI — kritik izolyatsiya (security topilmasi 3a)',
    async () => {
      const res = await request(app!.getHttpServer())
        .options('/api/v1/staff/auth/refresh')
        .set('Origin', MARKETPLACE_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    },
  );

  /* Ikkinchi mustaqil security ko'rib chiqishi topilmasi: Express marshrutlash
     katta-kichik harfni FARQLAMAYDI (`/api/v1/Staff/...` ham staff
     handler'ga yetib boradi), lekin ILGARI CORS delegate xom `req.url`ni
     katta-kichik harfsizlantirmasdan solishtirardi — natijada katta harfli
     variant marketplace CORS ro'yxati bilan tekshirilardi (izolyatsiya
     chetlab o'tilardi). `common/http/cors.ts` endi yo'lni kichik harfga
     keltiradi — bu ikkita test aynan shu holatni qamraydi. */
  t(
    'staff yo‘l, KATTA HARFLI variant (/Staff/auth/refresh): baribir staff ro‘yxatidan o‘tadi, marketplace origin RAD ETILADI',
    async () => {
      const res = await request(app!.getHttpServer())
        .options('/api/v1/Staff/auth/refresh')
        .set('Origin', MARKETPLACE_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    },
  );

  t(
    'staff yo‘l, KATTA HARFLI variant (/Staff/auth/refresh): ruxsat etilgan admin origin baribir qabul qilinadi',
    async () => {
      const res = await request(app!.getHttpServer())
        .options('/api/v1/Staff/auth/refresh')
        .set('Origin', ADMIN_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBe(ADMIN_ORIGIN);
    },
  );
});
