import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id — OTP kodi VA staff paroli uchun YAGONA hash manbai (ikkalasi ham
 * bir xil kutubxona, bir xil sozlama). `verify()` — vaqt-doimiy taqqoslash
 * argon2'ning o'zida (qayta hisoblangan digest bilan solishtirish) — qo'shimcha
 * o'ram shart emas.
 *
 * OTP kodi (6 xonali, past entropiya) uchun ham argon2id ishlatiladi — asosiy
 * himoya baribir RATE LIMIT (`RateLimiterService`) va urinish-cheklovi
 * (`OtpCode.attempts`), hash faqat "DB sizib chiqsa kodlar ochiq matnda
 * bo'lmasin" qatlami.
 */
@Injectable()
export class HashService {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  /** Noto'g'ri/buzilgan hash — `false` qaytaradi, tashlamaydi. */
  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
