import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { dropDatabase, flushRedis, provisionDb, requireInfraOrSkip } from './support/e2e-infra';
import { buildTestApp } from './support/build-app';
import { SMS_PROVIDER } from '@/infra/sms/sms-provider.interface';
import { CapturingSmsProvider, createApprovedSeller, createStaffSession, freshDb } from './support/fixtures';

const DB = 'health_e2e';

describe('Category + Public marketplace (e2e)', () => {
  let app: INestApplication | undefined;
  let reachable = false;
  let sms!: CapturingSmsProvider;
  let db: PrismaClient | undefined;

  beforeAll(async () => {
    reachable = await requireInfraOrSkip('marketplace.e2e');
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

  // ── Category ─────────────────────────────────────────────────────────

  t('Public GET /categories — faqat ACTIVE ko‘rinadi', async () => {
    const staff = await createStaffSession(app!, db!, ['CATEGORIES']);
    await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ slug: 'public-visible-cat', nameUz: 'Ko‘rinadi', nameRu: 'Видно', nameEn: 'Visible' })
      .expect(200);
    const hidden = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ slug: 'public-hidden-cat', nameUz: 'Yashirin', nameRu: 'Скрыто', nameEn: 'Hidden' })
      .expect(200);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/categories/${hidden.body.id}/archive`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);

    const list = await request(app!.getHttpServer()).get('/api/v1/categories').expect(200);
    const slugs = list.body.map((c: { slug: string }) => c.slug);
    expect(slugs).toContain('public-visible-cat');
    expect(slugs).not.toContain('public-hidden-cat');
  });

  t('Slug unique — takroriy slug CATEGORY_SLUG_EXISTS bilan rad etiladi', async () => {
    const staff = await createStaffSession(app!, db!, ['CATEGORIES']);
    await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ slug: 'dup-slug-test', nameUz: 'A', nameRu: 'A', nameEn: 'A' })
      .expect(200);
    const dup = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ slug: 'dup-slug-test', nameUz: 'B', nameRu: 'B', nameEn: 'B' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('CATEGORY_SLUG_EXISTS');
  });

  t('CATEGORIES huquqisiz oddiy foydalanuvchi kategoriya yarata olmaydi', async () => {
    const res = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .send({ slug: 'no-auth-test', nameUz: 'X', nameRu: 'X', nameEn: 'X' });
    expect(res.status).toBe(401);
  });

  t('Staff archive → activate — round-trip', async () => {
    const staff = await createStaffSession(app!, db!, ['CATEGORIES']);
    const cat = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ slug: 'archive-activate-test', nameUz: 'A', nameRu: 'A', nameEn: 'A' })
      .expect(200);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/categories/${cat.body.id}/archive`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    const reactivated = await request(app!.getHttpServer())
      .post(`/api/v1/staff/categories/${cat.body.id}/activate`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .expect(200);
    expect(reactivated.body.status).toBe('ACTIVE');
  });

  // ── Public marketplace browse ────────────────────────────────────────

  t('Faqat ACTIVE service ko‘rinadi — draft/pending/rejected/paused/archived YO‘Q', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const catRes = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ slug: 'visibility-test', nameUz: 'V', nameRu: 'V', nameEn: 'V' })
      .expect(200);
    const categoryId = catRes.body.id;
    const sellerAuth = { Authorization: `Bearer ${seller.accessToken}` };
    const staffAuth = { Authorization: `Bearer ${kyc.accessToken}` };

    async function makeService(title: string) {
      const res = await request(app!.getHttpServer())
        .post('/api/v1/seller/services')
        .set(sellerAuth)
        .send({ categoryId, title, description: 'x'.repeat(25), price: 10_000, deliveryDays: 1 })
        .expect(200);
      return res.body.id as string;
    }

    const draftId = await makeService('Visibility draft service');

    const pendingId = await makeService('Visibility pending service');
    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${pendingId}/submit`).set(sellerAuth).expect(200);

    const rejectedId = await makeService('Visibility rejected service');
    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${rejectedId}/submit`).set(sellerAuth).expect(200);
    await request(app!.getHttpServer())
      .post(`/api/v1/staff/services/${rejectedId}/reject`)
      .set(staffAuth)
      .send({ reason: 'visibility test rejection reason' })
      .expect(200);

    const activeId = await makeService('Visibility ACTIVE service');
    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${activeId}/submit`).set(sellerAuth).expect(200);
    await request(app!.getHttpServer()).post(`/api/v1/staff/services/${activeId}/approve`).set(staffAuth).expect(200);

    const pausedId = await makeService('Visibility paused service');
    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${pausedId}/submit`).set(sellerAuth).expect(200);
    await request(app!.getHttpServer()).post(`/api/v1/staff/services/${pausedId}/approve`).set(staffAuth).expect(200);
    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${pausedId}/pause`).set(sellerAuth).expect(200);

    const archivedId = await makeService('Visibility archived service');
    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${archivedId}/archive`).set(sellerAuth).expect(200);

    const list = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ category: 'visibility-test', perPage: 100 })
      .expect(200);
    const ids = list.body.items.map((s: { id: string }) => s.id);
    expect(ids).toEqual([activeId]);
    expect(ids).not.toContain(draftId);
    expect(ids).not.toContain(pendingId);
    expect(ids).not.toContain(rejectedId);
    expect(ids).not.toContain(pausedId);
    expect(ids).not.toContain(archivedId);

    for (const hiddenId of [draftId, pendingId, rejectedId, pausedId, archivedId]) {
      const res = await request(app!.getHttpServer()).get(`/api/v1/services/${hiddenId}`);
      expect(res.status).toBe(404);
    }
    const visible = await request(app!.getHttpServer()).get(`/api/v1/services/${activeId}`).expect(200);
    expect(visible.body.status).toBeUndefined(); // public DTO'da status YO'Q
    expect(visible.body.rejectionReason).toBeUndefined();
  });

  t('Pagination — bounded (perPage>100 rad etiladi), page/perPage ishlaydi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const catRes = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ slug: 'pagination-test', nameUz: 'P', nameRu: 'P', nameEn: 'P' })
      .expect(200);
    const categoryId = catRes.body.id;
    const sellerAuth = { Authorization: `Bearer ${seller.accessToken}` };
    const staffAuth = { Authorization: `Bearer ${kyc.accessToken}` };

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app!.getHttpServer())
        .post('/api/v1/seller/services')
        .set(sellerAuth)
        .send({ categoryId, title: `Pagination service ${i}`, description: 'x'.repeat(25), price: 10_000 + i, deliveryDays: 1 })
        .expect(200);
      await request(app!.getHttpServer()).post(`/api/v1/seller/services/${res.body.id}/submit`).set(sellerAuth).expect(200);
      await request(app!.getHttpServer()).post(`/api/v1/staff/services/${res.body.id}/approve`).set(staffAuth).expect(200);
    }

    const page1 = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ category: 'pagination-test', page: 1, perPage: 2 })
      .expect(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.total).toBe(5);
    expect(page1.body.totalPages).toBe(3);

    const tooBig = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ category: 'pagination-test', perPage: 101 });
    expect(tooBig.status).toBe(422);
  });

  t('Filter — price min/max, sort=price_asc/price_desc, noma’lum sort rad etiladi', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const catRes = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ slug: 'price-filter-test', nameUz: 'F', nameRu: 'F', nameEn: 'F' })
      .expect(200);
    const categoryId = catRes.body.id;
    const sellerAuth = { Authorization: `Bearer ${seller.accessToken}` };
    const staffAuth = { Authorization: `Bearer ${kyc.accessToken}` };

    const prices = [50_000, 150_000, 300_000];
    for (const price of prices) {
      const res = await request(app!.getHttpServer())
        .post('/api/v1/seller/services')
        .set(sellerAuth)
        .send({ categoryId, title: `Price filter service ${price}`, description: 'x'.repeat(25), price, deliveryDays: 1 })
        .expect(200);
      await request(app!.getHttpServer()).post(`/api/v1/seller/services/${res.body.id}/submit`).set(sellerAuth).expect(200);
      await request(app!.getHttpServer()).post(`/api/v1/staff/services/${res.body.id}/approve`).set(staffAuth).expect(200);
    }

    const filtered = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ category: 'price-filter-test', priceMin: 100_000, priceMax: 200_000 })
      .expect(200);
    expect(filtered.body.items.map((s: { price: number }) => s.price)).toEqual([150_000]);

    const asc = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ category: 'price-filter-test', sort: 'price_asc' })
      .expect(200);
    expect(asc.body.items.map((s: { price: number }) => s.price)).toEqual([50_000, 150_000, 300_000]);

    const desc = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ category: 'price-filter-test', sort: 'price_desc' })
      .expect(200);
    expect(desc.body.items.map((s: { price: number }) => s.price)).toEqual([300_000, 150_000, 50_000]);

    const badSort = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ category: 'price-filter-test', sort: 'made_up_sort' });
    expect(badSort.status).toBe(422);
  });

  t('Search — title bo‘yicha ILIKE (case-insensitive)', async () => {
    const kyc = await createStaffSession(app!, db!, ['KYC', 'CATEGORIES', 'SERVICES']);
    const seller = await createApprovedSeller(app!, sms, kyc.accessToken);
    const catRes = await request(app!.getHttpServer())
      .post('/api/v1/staff/categories')
      .set('Authorization', `Bearer ${kyc.accessToken}`)
      .send({ slug: 'search-test', nameUz: 'S', nameRu: 'S', nameEn: 'S' })
      .expect(200);
    const categoryId = catRes.body.id;
    const sellerAuth = { Authorization: `Bearer ${seller.accessToken}` };
    const staffAuth = { Authorization: `Bearer ${kyc.accessToken}` };

    const svc = await request(app!.getHttpServer())
      .post('/api/v1/seller/services')
      .set(sellerAuth)
      .send({ categoryId, title: 'UNIQUE-SEARCHABLE-TITLE service', description: 'x'.repeat(25), price: 1000, deliveryDays: 1 })
      .expect(200);
    await request(app!.getHttpServer()).post(`/api/v1/seller/services/${svc.body.id}/submit`).set(sellerAuth).expect(200);
    await request(app!.getHttpServer()).post(`/api/v1/staff/services/${svc.body.id}/approve`).set(staffAuth).expect(200);

    const found = await request(app!.getHttpServer())
      .get('/api/v1/services')
      .query({ search: 'unique-searchable' })
      .expect(200);
    expect(found.body.items.map((s: { id: string }) => s.id)).toContain(svc.body.id);
  });
});
