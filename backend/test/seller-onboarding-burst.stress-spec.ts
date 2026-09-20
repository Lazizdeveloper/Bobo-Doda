import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { CapturingSmsProvider, freshDb, loginNewUser } from './support/fixtures';

// `jest-e2e.setup.ts` `DATABASE_URL`/`DATABASE_MIGRATION_URL`ni import
// vaqtidayoq QATTIQ `health_e2e` deb belgilaydi (boshqa BARCHA e2e
// fayllar bilan bir xil konvensiya) — boshqa nom bersak app haqiqatda
// ulanadigan DB hech qachon provision qilinmagan bo'lib qoladi.
const DB = 'health_e2e';

/**
 * Bosqich 23 — `seller-onboarding.e2e-spec.ts`dan ko'chirilgan. Bir xil CAS
 * invariant'ni (unique constraint — faqat BITTA `sellerApplication` qatori)
 * asosiy fayldagi "Concurrent double-submit" (2x parallel) allaqachon
 * ishonchli tekshiradi; bu fayl AYNAN SHU invariant'ni 10x chinakam
 * bir vaqtdagi so'rov ostida tekshiradi — CI runner'ning resurs chegarasini
 * haqiqatan siqib ko'radigan yuklama testi, moliyaviy/mantiqiy to'g'rilik
 * uchun QO'SHIMCHA dalil emas (u allaqachon bor). Alohida, NOBLOKLOVCHI
 * skript (`npm run test:e2e:stress`, backend-ci.yml'da
 * `continue-on-error: true`) — natija ko'rinadi, lekin majburiy "quality"/
 * "integration" gate'ni to'smaydi. Real GitHub Actions'ning standart 2 vCPU
 * runner'ida bu aniq shu haddan tashqari yuklama ostida transport darajasida
 * (`ECONNRESET`) beqaror bo'lib chiqdi — DB constraint yoki ilova mantig'ida
 * emas (RUNBOOK/PRODUCTION-READINESS §23'da batafsil).
 */
describe('Seller-application 10x parallel burst (stress, informational)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('seller-onboarding-burst.stress');
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

  it('10 ta PARALLEL submit — FAQAT bitta PENDING ariza yaratiladi, qolgan 9tasi deterministik konflikt', async () => {
    if (!reachable) return;
    const session = await loginNewUser(app!, sms, 'SELLER');
    const payload = { legalName: 'Parallel Legal', displayName: 'Parallel Display' };
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app!.getHttpServer())
          .post('/api/v1/me/seller-application')
          .set('Authorization', `Bearer ${session.accessToken}`)
          .send(payload),
      ),
    );
    const succeeded = results.filter((r) => r.status === 200);
    const conflicted = results.filter((r) => r.status === 409);
    expect(succeeded.length).toBe(1);
    expect(conflicted.length).toBe(9);
    for (const r of conflicted) {
      expect(r.body.code).toBe('SELLER_APPLICATION_ALREADY_PENDING');
    }

    const count = await db!.sellerApplication.count({ where: { userId: session.userId } });
    expect(count).toBe(1);
  });
});
