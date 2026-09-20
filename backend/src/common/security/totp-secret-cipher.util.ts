import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Bosqich 11, bo'lim 9 — TOTP siri at-rest shifrlash. AES-256-GCM
 * (authenticated encryption) — Node yerli `crypto`, YANGI kutubxona YO'Q,
 * custom kriptografiya IXTIRO QILINMAGAN (standart algoritm, standart
 * rejim).
 *
 * Format (bo'lim 59 — kelajakda kalit rotatsiyasi UMUMAN IMKONSIZ
 * bo'lmasin deb versiya prefiksi bilan, lekin ARTIQ MURAKKABLASHTIRMASDAN
 * — hozircha FAQAT "v1" bor, alohida kalit-versiya jadvali/reestri YO'Q):
 *
 *   v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 *
 * Kalit — `STAFF_TOTP_ENCRYPTION_KEY` (32 bayt, 64 ta hex belgi),
 * `AppConfigService` orqali. Bu fayl kalitni O'ZI o'qimaydi (config
 * qatlamiga bog'liq emas) — chaqiruvchi uzatadi (`Buffer`), test/unit
 * darajasida oson tekshirilishi uchun.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM uchun tavsiya etilgan 96 bit
const FORMAT_VERSION = 'v1';

export function parseTotpEncryptionKey(hexKey: string): Buffer {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) {
    throw new Error('STAFF_TOTP_ENCRYPTION_KEY 32 bayt (64 ta hex belgi) bo‘lishi shart');
  }
  return key;
}

export function encryptTotpSecret(plainBase32Secret: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBase32Secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${FORMAT_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/** Buzilgan/mos kelmaydigan formatda — `Error` tashlaydi (chaqiruvchi buni "yaroqsiz holat" deb ko'rishi kerak, jimgina yutilmaydi). */
export function decryptTotpSecret(encoded: string, key: Buffer): string {
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('decryptTotpSecret: noma’lum yoki buzilgan format');
  }
  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex!, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex!, 'hex'));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextHex!, 'hex')), decipher.final()]);
  return plain.toString('utf8');
}
