/**
 * Bosqich 13, bo'lim 2.1.2.6 — PlayMobile `message-id`: "Уникальный для
 * системы-отправителя идентификатор сообщения... Размер поля не более 20
 * символов." Bizning tomonimiz TANLAYDI (provider bermaydi) — shuning
 * uchun bu YAGONA joy qayerda idempotency reference (Outbox'dagi
 * `reference`, UUIDv7 — 36 belgi) 20 belgigacha xavfsiz qisqartiriladi.
 */
import { createHash, randomBytes } from 'node:crypto';

/**
 * `reference` berilgan bo'lsa (Outbox — bo'lim 5/17: qayta urinishda BIR
 * XIL id kerak, tasodifiy EMAS) — deterministik hash orqali 20 hex
 * belgiga qisqartiriladi (bir xil reference → bir xil natija, har doim).
 * `reference` yo'q bo'lsa (OTP — bir martalik, stability shart emas)
 * tasodifiy 20 hex belgi.
 */
export function derivePlayMobileMessageId(reference?: string): string {
  if (reference) {
    return createHash('sha256').update(reference).digest('hex').slice(0, 20);
  }
  return randomBytes(10).toString('hex');
}
