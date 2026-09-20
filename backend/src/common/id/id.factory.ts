import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

/**
 * ID YARATISHNING YAGONA MANBAI (A1).
 *
 * Barcha birlamchi kalitlar — **UUIDv7**. Boshqa HECH QAYERDA ID generatsiya
 * qilinmaydi: Prisma `@default(uuid())` (v4) schema'dan olib tashlangan,
 * service qatlami yozishda `newId()` (yoki DI orqali `IdFactory.next()`)
 * ishlatadi.
 *
 * Nega v7, v4 emas:
 *   `LedgerEntry`, `Message`, `AuditLog`, `Notification` — vaqt bo'yicha
 *   o'sadigan, ko'p yoziladigan jadvallar. Tasodifiy v4 B-tree indeksini
 *   butun sahifalar bo'ylab sochadi — har `INSERT` tasodifiy sahifani
 *   diskdan chaqiradi, yozuv tezligi jadval o'sgani sayin pasayadi. v7 —
 *   birinchi 48 bit Unix-millisekund, shuning uchun yozuv doim indeks
 *   OXIRIGA tushadi. `uuidv7` paketi bir millisekund ichida ham monotonik
 *   tartibni kafolatlaydi (ichki hisoblagich), shuning uchun ID'lar
 *   leksikografik jihatdan qat'iy o'sadi.
 *
 * Postgres 16 da native `uuidv7()` yo'q (PG18+), shuning uchun generatsiya
 * ilova darajasida.
 */
export function newId(): string {
  return uuidv7();
}

/** DI/test uchun o'ram. Servislar `constructor(private readonly ids: IdFactory)`. */
@Injectable()
export class IdFactory {
  next(): string {
    return newId();
  }
}
