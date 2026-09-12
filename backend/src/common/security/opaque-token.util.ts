import { createHash, randomBytes } from 'node:crypto';

/**
 * Refresh token (marketplace VA staff) — 256 bitli tasodifiy opaque satr,
 * JWT EMAS. DB'da xom holda SAQLANMAYDI — faqat hash (pastga qarang).
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * `tokenHash` uchun **SHA-256**, Argon2id EMAS — ATAYLAB.
 *
 * `HashService` (argon2id) — PAST entropiyali sirlar (OTP kodi, parol) uchun:
 * qimmat hisoblash offline-bruteforce'ni sekinlashtiradi, va QIDIRUV boshqa
 * maydon (telefon/email) bo'yicha bo'lgani uchun hash'ning DETERMINISTIK
 * emasligi muammo emas.
 *
 * Refresh token — TESKARISI: 256 bit tasodifiylik (bruteforce baribir
 * amaliy jihatdan imkonsiz — hash tezligi bu yerda himoya omili EMAS), lekin
 * qidiruv AYNAN shu hash bo'yicha (`WHERE tokenHash = ?`) — argon2'ning
 * tasodifiy "salt"i buni SINDIRARDI (bir xil kirish har safar boshqa hash
 * beradi). SHA-256 — tez, DETERMINISTIK, va manba (xom token) preimage
 * hujumiga amaliy chidamli.
 */
export function hashOpaqueToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
