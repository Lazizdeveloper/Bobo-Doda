/**
 * Bosqich 9, bo'lim 4/5 — Payment/Refund/Payout UCHTALASI uchun UMUMIY
 * reconciliation-query natijasi. `payment-provider.interface.ts`dagi
 * `VerifiedPaymentWebhookEvent['status']` ("SUCCEEDED"|"FAILED"|"CANCELLED")
 * bilan ATAYLAB ALOHIDA — webhook hodisasi HAR DOIM ANIQ (provider o'zi
 * push qilgan), lekin bir marotalik SO'ROV (query) natijasi ANIQSIZ bo'lishi
 * MUMKIN (provider hali javob bermagan/tushunarsiz javob bergan) — shu
 * ikkita semantikani bitta tur bilan ifodalash xato xulosalarga olib
 * kelardi (bo'lim 41: "Unknown provider statusni FAILED ga default
 * qilma").
 *
 * `NOT_FOUND`/`UNKNOWN` — ALOHIDA semantik holatlar (bo'lim 5/11/41):
 *  - `NOT_FOUND`: provider bu referensni UMUMAN tanimaydi (propagation
 *    kechikishi yoki noto'g'ri reference bo'lishi mumkin — darhol FAILED
 *    degani EMAS).
 *  - `UNKNOWN`: provider javob berdi, lekin natijani BIZNING mapping
 *    kodimiz aniq tasniflay olmadi (masalan yangi/hujjatlashtirilmagan
 *    status qiymati) — "operation failed" EMAS, "authoritative status
 *    hozircha aniqlanmadi" degani.
 */
export type ProviderOperationState = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'NOT_FOUND' | 'UNKNOWN';

/** Faqat mutatsiyaga LOYIQ terminal holatlar (bo'lim 8/9: reconciliation faqat shu ikkitasida amal qiladi). */
export const RECONCILABLE_TERMINAL_STATES: readonly ProviderOperationState[] = ['SUCCEEDED', 'FAILED'];

export interface ProviderQueryResult {
  state: ProviderOperationState;
  /** Provider'ning o'z identifikatori (diagnostika uchun) — mavjud bo'lmasa `null`. */
  providerReference: string | null;
}
