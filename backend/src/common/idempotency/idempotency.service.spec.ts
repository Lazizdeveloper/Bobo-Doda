import { Prisma } from '@prisma/client';
import { IdempotencyService } from './idempotency.service';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import type { IdFactory } from '@/common/id/id.factory';
import { DomainError } from '@/common/errors/domain-error';

/**
 * `IdempotencyKey.@@unique([key, userId, endpoint])`ni real DB'siz sinash
 * uchun yengil in-memory soxta jadval — `create()` unique buzilishida
 * HAQIQIY Prisma xatosi bilan bir xil shaklda tashlaydi (`P2002`), servis
 * kodi shu orqali "band qilingan" holatni aniqlaydi.
 */
class FakeIdempotencyKeyTable {
  rows = new Map<string, Record<string, unknown>>();

  private keyOf(k: { key: string; userId: string; endpoint: string }): string {
    return `${k.key}::${k.userId}::${k.endpoint}`;
  }

  create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
    const k = this.keyOf(data as { key: string; userId: string; endpoint: string });
    if (this.rows.has(k)) {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
    }
    // Prisma'dagi haqiqiy ustun sukutlari bilan bir xil: `statusCode`/
    // `responseSnapshot` berilmasa ustun NULL bo'ladi (`undefined` EMAS) —
    // servis kodi aynan shu `=== null` tekshiruviga tayanadi.
    const row = { statusCode: null, responseSnapshot: null, ...data };
    this.rows.set(k, row);
    return row;
  });

  findUnique = jest.fn(async ({ where }: { where: { key_userId_endpoint: { key: string; userId: string; endpoint: string } } }) => {
    const k = this.keyOf(where.key_userId_endpoint);
    return this.rows.get(k) ?? null;
  });

  update = jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    for (const row of this.rows.values()) {
      if (row.id === where.id) Object.assign(row, data);
    }
  });

  updateMany = jest.fn(
    async ({ where, data }: { where: { id: string; statusCode: number | null }; data: Record<string, unknown> }) => {
      for (const row of this.rows.values()) {
        if (row.id === where.id && row.statusCode === where.statusCode) {
          Object.assign(row, data);
          return { count: 1 };
        }
      }
      return { count: 0 };
    },
  );

  delete = jest.fn(async ({ where }: { where: { id: string } }) => {
    for (const [k, row] of this.rows.entries()) {
      if (row.id === where.id) this.rows.delete(k);
    }
  });
}

function build() {
  const table = new FakeIdempotencyKeyTable();
  const prisma = { idempotencyKey: table } as unknown as PrismaService;
  let counter = 0;
  const ids: IdFactory = { next: () => `id-${++counter}` };
  return { service: new IdempotencyService(prisma, ids), table };
}

const PARAMS = { userId: 'u1', endpoint: 'POST /test', requestPayload: { a: 1 } };

describe('IdempotencyService', () => {
  it('kalit yo‘q bo‘lsa — fn() to‘g‘ridan-to‘g‘ri bajariladi, hech narsa saqlanmaydi', async () => {
    const { service, table } = build();
    const fn = jest.fn().mockResolvedValue({ statusCode: 200, body: { ok: true } });
    const result = await service.run({ ...PARAMS, key: undefined }, fn);
    expect(result).toEqual({ statusCode: 200, body: { ok: true } });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(table.rows.size).toBe(0);
  });

  it('yangi kalit — natija saqlanadi va qaytariladi', async () => {
    const { service } = build();
    const fn = jest.fn().mockResolvedValue({ statusCode: 200, body: { ok: true } });
    const result = await service.run({ ...PARAMS, key: 'k1' }, fn);
    expect(result).toEqual({ statusCode: 200, body: { ok: true } });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('bir xil kalit + bir xil so‘rov — fn() QAYTA CHAQIRILMAYDI, saqlangan natija qaytadi', async () => {
    const { service } = build();
    const fn = jest.fn().mockResolvedValue({ statusCode: 200, body: { ok: true } });
    await service.run({ ...PARAMS, key: 'k1' }, fn);
    const second = await service.run({ ...PARAMS, key: 'k1' }, fn);
    expect(second).toEqual({ statusCode: 200, body: { ok: true } });
    expect(fn).toHaveBeenCalledTimes(1); // provider/business logika BIR MARTA
  });

  it('bir xil kalit + BOSHQA so‘rov tanasi — IDEMPOTENCY_CONFLICT', async () => {
    const { service } = build();
    const fn = jest.fn().mockResolvedValue({ statusCode: 200, body: { ok: true } });
    await service.run({ ...PARAMS, key: 'k1' }, fn);
    await expect(service.run({ ...PARAMS, key: 'k1', requestPayload: { a: 2 } }, fn)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('DomainError natija ham deterministik saqlanadi va replay qilinadi', async () => {
    const { service } = build();
    const fn = jest.fn().mockRejectedValue(new DomainError('PAYMENT_NOT_ALLOWED', 'yo‘q'));
    await expect(service.run({ ...PARAMS, key: 'k1' }, fn)).rejects.toMatchObject({ code: 'PAYMENT_NOT_ALLOWED' });
    // Qayta so'ralganda — fn() YANA chaqirilmaydi, xuddi shu xato qaytadi.
    await expect(service.run({ ...PARAMS, key: 'k1' }, fn)).rejects.toMatchObject({ code: 'PAYMENT_NOT_ALLOWED' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('hali ishlov berilmoqda (statusCode=null) — staleAfterMs berilmasa doim IDEMPOTENCY_CONFLICT', async () => {
    const { service, table } = build();
    const hang = jest.fn(() => new Promise<never>(() => {})); // hech qachon tugamaydi
    void service.run({ ...PARAMS, key: 'k1' }, hang);
    await new Promise((r) => setTimeout(r, 0)); // create() commit bo'lsin
    expect([...table.rows.values()][0]?.statusCode).toBeNull();

    const fn2 = jest.fn();
    await expect(service.run({ ...PARAMS, key: 'k1' }, fn2)).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(fn2).not.toHaveBeenCalled();
  });

  it('bo‘lim 12 — staleAfterMs berilib, band vaqti oshib ketgan bo‘lsa boshqa so‘rov qayta ishga tushiradi', async () => {
    const { service, table } = build();
    // Qulagan worker'ni simulyatsiya qilamiz: qator statusCode=null holda qoladi.
    table.rows.set('k1::u1::POST /test', {
      id: 'stuck-1',
      key: 'k1',
      userId: 'u1',
      endpoint: 'POST /test',
      requestHash: IdempotencyService.hashRequest(PARAMS.requestPayload),
      statusCode: null,
      responseSnapshot: null,
      createdAt: new Date(Date.now() - 60_000), // 60s oldin — juda uzoq
    });

    const fn = jest.fn().mockResolvedValue({ statusCode: 200, body: { recovered: true } });
    const result = await service.run({ ...PARAMS, key: 'k1', staleAfterMs: 30_000 }, fn);
    expect(result).toEqual({ statusCode: 200, body: { recovered: true } });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('klassifikatsiya qilinmagan (DomainError bo‘lmagan) xato — rezervatsiya O‘CHIRILADI, keyingi urinish qaytadan boshlanadi', async () => {
    const { service, table } = build();
    const fn1 = jest.fn().mockRejectedValue(new Error('kutilmagan DB xatosi'));
    await expect(service.run({ ...PARAMS, key: 'k1' }, fn1)).rejects.toThrow('kutilmagan DB xatosi');
    expect(table.rows.size).toBe(0); // stuck-forever emas — o'chirildi

    const fn2 = jest.fn().mockResolvedValue({ statusCode: 200, body: { ok: true } });
    const result = await service.run({ ...PARAMS, key: 'k1' }, fn2);
    expect(result).toEqual({ statusCode: 200, body: { ok: true } });
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
