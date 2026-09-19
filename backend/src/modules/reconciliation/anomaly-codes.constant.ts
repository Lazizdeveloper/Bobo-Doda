/**
 * Bo'lim 22 — `FinancialAnomaly.code` uchun kichik, ICHKI, hujjatlashtirilgan
 * to'plam (Prisma enum EMAS — bo'lim 22: "overengineering qilma", tez-tez
 * kengayishi mumkin bo'lgan tasnif migratsiya talab qilmasin).
 */
export const ANOMALY_CODES = {
  // ── Reconciliation-vaqtidagi (bo'lim 11/41/42/43) ─────────────────────
  /** Bo'lim 11 — provider referensni tanimaydi (darhol FAILED emas). */
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  /** Bo'lim 41 — provider javob berdi, lekin natija tasniflab bo'lmadi. */
  PROVIDER_STATUS_UNKNOWN: 'PROVIDER_STATUS_UNKNOWN',
  /** Bo'lim 42/43 — local terminal holat provider natijasiga ZID (masalan local FAILED, provider SUCCEEDED). */
  TERMINAL_CONTRADICTION: 'TERMINAL_CONTRADICTION',
  /** Bo'lim 34/35 — max retries tugadi YOKI provider config/auth xatosi — operator qo'lda ko'rib chiqishi kerak. */
  NEEDS_MANUAL_REVIEW: 'NEEDS_MANUAL_REVIEW',

  // ── Ledger integrity (bo'lim 21/65/66) ─────────────────────────────────
  SUCCEEDED_PAYMENT_WITHOUT_FUNDING: 'SUCCEEDED_PAYMENT_WITHOUT_FUNDING',
  FUNDING_WITHOUT_SUCCEEDED_PAYMENT: 'FUNDING_WITHOUT_SUCCEEDED_PAYMENT',
  COMPLETED_CONTRACT_WITHOUT_SETTLEMENT: 'COMPLETED_CONTRACT_WITHOUT_SETTLEMENT',
  SUCCEEDED_REFUND_WITHOUT_JOURNAL: 'SUCCEEDED_REFUND_WITHOUT_JOURNAL',
  FAILED_PAYOUT_MISSING_RELEASE: 'FAILED_PAYOUT_MISSING_RELEASE',
  SUCCEEDED_PAYOUT_WITHOUT_RESERVATION: 'SUCCEEDED_PAYOUT_WITHOUT_RESERVATION',
  UNBALANCED_LEDGER_TRANSACTION: 'UNBALANCED_LEDGER_TRANSACTION',
  NEGATIVE_USER_ACCOUNT_BALANCE: 'NEGATIVE_USER_ACCOUNT_BALANCE',

  // ── Dispute (Bosqich 8, bo'lim 21 — mavjud tekshiruvlar qayta ishlatiladi) ──
  DISPUTE_POST_SETTLEMENT_WITHOUT_HOLD: 'DISPUTE_POST_SETTLEMENT_WITHOUT_HOLD',
  DISPUTE_RESOLVED_WITHOUT_SELLER_JOURNAL: 'DISPUTE_RESOLVED_WITHOUT_SELLER_JOURNAL',
  DISPUTE_RESOLVED_WITHOUT_REFUND: 'DISPUTE_RESOLVED_WITHOUT_REFUND',
  DISPUTE_REFUND_AMOUNT_MISMATCH: 'DISPUTE_REFUND_AMOUNT_MISMATCH',
} as const;

export type AnomalyCode = (typeof ANOMALY_CODES)[keyof typeof ANOMALY_CODES];
