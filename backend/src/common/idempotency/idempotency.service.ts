import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { DomainError } from '@/common/errors/domain-error';
import type { ErrorCode } from '@/common/errors/error-codes';

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 soat — `IdempotencyKey` schema izohi bilan bir xil
/** `statusCode`dagi zaxira qiymat — "stale in-flight qatorni band qildim" belgisi (haqiqiy HTTP status >= 100). */
const CLAIMED_SENTINEL = -1;

export interface IdempotentResult<T> {
  statusCode: number;
  body: T;
}

export interface IdempotencyRunParams {
  key: string | undefined;
  userId: string;
  endpoint: string;
  requestPayload: unknown;
  /**
   * Bosqich 5, bo'lim 12 — "DB row created, process dies" crash-recovery.
   * Berilmasa (sukut, Bosqich 4 chaqiruvchilari) — eski xatti-harakat: "hali
   * ishlov berilmoqda" holati kalitning 24 soatlik TTL'i tugagunicha
   * abadiy `IDEMPOTENCY_CONFLICT` qaytaradi. Berilsa — shu millisekunddan
   * ko'proq vaqt "band" holatida qolgan yozuv TASHLAB KETILGAN deb hisoblanadi
   * (worker qulagan) va boshqa so'rov uni CAS orqali qayta band qilib
   * ishga tushirishi mumkin. Moliyaviy endpoint'lar uchun MOS (`PaymentService`),
   * Bosqich 1-4 chaqiruvchilari o'zgarishsiz qoladi (opt-in, orqaga mos).
   */
  staleAfterMs?: number;
}

interface StoredErrorSnapshot {
  [key: string]: unknown;
  __error: true;
  code: string;
  message: string;
}

/**
 * `IdempotencyKey` (Bosqich 1'dan schema'da bor) — Bosqich 4'da BIRINCHI
 * marta ulangan (`POST /contracts`), Bosqich 5'da moliyaviy endpoint
 * (`POST /me/contracts/:id/payment`) uchun QAYTA ISHLATILADI — umumiy
 * servis, alohida "payment idempotency" YOZILMAYDI.
 *
 * Naqsh — SellerApplication'ning "bitta PENDING" bilan BIR XIL: ilova
 * darajasidagi tekshiruv EMAS, DB unique constraint (`@@unique([key,
 * userId, endpoint])`) CAS sifatida ishlatiladi — parallel ikkita so'rov
 * bo'lsa faqat BITTASI rezervatsiya yaratadi.
 *
 * Xato natija ham SAQLANADI (`statusCode >= 400`) — chinakam idempotent —
 * LEKIN faqat `DomainError` (deterministik: validatsiya/biznes konflikt).
 * Kutilmagan (klassifikatsiya qilinmagan) xato HECH QACHON "doimiy xato
 * javobi" sifatida keshlanmaydi (Bosqich 5 audit, bo'lim 11 — "500/502/503/
 * timeout doimiy idempotent javob sifatida saqlash xavfli") — bunday holatda
 * rezervatsiya butunlay O'CHIRILADI, keyingi urinish YANGI qator yaratib
 * qaytadan boshlaydi. Bu xavfsiz, chunki chaqiruvchi (masalan
 * `PaymentService`) tashqi provider chaqiruvidan keyingi HAR bir noaniq
 * natijani ALLAQACHON aniq `DomainError`ga o'raydi (`PAYMENT_PROVIDER_*`) —
 * bu branch amalda faqat provider'ga YETIB BORMAGAN ichki xatolar uchun.
 */
@Injectable()
export class IdempotencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
  ) {}

  static hashRequest(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async run<T>(params: IdempotencyRunParams, fn: () => Promise<IdempotentResult<T>>): Promise<IdempotentResult<T>> {
    if (!params.key) {
      return fn(); // Idempotency ixtiyoriy — kalit yo'q bo'lsa oddiy bajaradi.
    }

    const requestHash = IdempotencyService.hashRequest(params.requestPayload);
    const id = this.ids.next();

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          id,
          key: params.key,
          userId: params.userId,
          endpoint: params.endpoint,
          requestHash,
          expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return this.replay<T>(params.key, params.userId, params.endpoint, requestHash, fn, params.staleAfterMs);
      }
      throw err;
    }

    return this.execute(id, fn);
  }

  private async execute<T>(id: string, fn: () => Promise<IdempotentResult<T>>): Promise<IdempotentResult<T>> {
    try {
      const result = await fn();
      await this.prisma.idempotencyKey.update({
        where: { id },
        data: { statusCode: result.statusCode, responseSnapshot: result.body as Prisma.InputJsonValue },
      });
      return result;
    } catch (err) {
      if (err instanceof DomainError) {
        const snapshot: StoredErrorSnapshot = { __error: true, code: err.code, message: err.message };
        await this.prisma.idempotencyKey
          .update({
            where: { id },
            data: { statusCode: err.httpStatus, responseSnapshot: snapshot as Prisma.InputJsonValue },
          })
          .catch(() => undefined); // Snapshot yozilmasa ham asl xato yo'qolmasin.
      } else {
        // Klassifikatsiya qilinmagan xato — semantik natija noma'lum, doimiy
        // keshlanmaydi. Rezervatsiyani o'chiramiz (aks holda 24 soat "band"
        // holatida qolib ketardi) — keyingi urinish erkin qayta boshlaydi.
        await this.prisma.idempotencyKey.delete({ where: { id } }).catch(() => undefined);
      }
      throw err;
    }
  }

  private async replay<T>(
    key: string,
    userId: string,
    endpoint: string,
    requestHash: string,
    fn: () => Promise<IdempotentResult<T>>,
    staleAfterMs: number | undefined,
  ): Promise<IdempotentResult<T>> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key_userId_endpoint: { key, userId, endpoint } },
    });
    if (!existing) {
      // Amalda bo'lmasligi kerak (endigina unique violation bo'ldi) — himoya.
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'So‘rov holati aniqlanmadi, qayta urinib ko‘ring');
    }
    if (existing.requestHash !== requestHash) {
      throw new DomainError(
        'IDEMPOTENCY_CONFLICT',
        'Bu Idempotency-Key boshqa so‘rov tanasi bilan allaqachon ishlatilgan',
      );
    }
    if (existing.statusCode === null || existing.statusCode === CLAIMED_SENTINEL) {
      if (
        staleAfterMs !== undefined &&
        existing.statusCode === null &&
        Date.now() - existing.createdAt.getTime() > staleAfterMs
      ) {
        // Bo'lim 12 — crash recovery: bu yozuv shu qadar uzoq "ishlov
        // berilmoqda" holatida qolganki, asl worker qulagan deb hisoblaymiz.
        // CAS orqali band qilishga urinamiz — faqat BITTA parallel adopter
        // yutadi (`updateMany` count-based, Phase 4 CAS naqshi bilan bir xil).
        const claimed = await this.prisma.idempotencyKey.updateMany({
          where: { id: existing.id, statusCode: null },
          data: { statusCode: CLAIMED_SENTINEL },
        });
        if (claimed.count === 1) {
          return this.execute(existing.id, fn);
        }
        // Boshqa so'rov bizdan oldin band qildi (yoki hozirgina tugadi) —
        // holatni qayta o'qib chiqamiz.
        return this.replay(key, userId, endpoint, requestHash, fn, staleAfterMs);
      }
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'So‘rov hali ishlov berilmoqda');
    }
    if (existing.statusCode >= 400) {
      const snap = existing.responseSnapshot as unknown as StoredErrorSnapshot;
      throw new DomainError(snap.code as ErrorCode, snap.message);
    }
    return { statusCode: existing.statusCode, body: existing.responseSnapshot as T };
  }
}
