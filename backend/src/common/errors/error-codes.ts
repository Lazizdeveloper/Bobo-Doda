/**
 * Xato taksonomiyasi — frontend `lib/api/errors.ts` bilan BITTA SHARTNOMA.
 *
 * Server javob tanasi: `{ code, message?, fieldErrors?, requestId? }`.
 * Frontend `toApiError()` avval `code` ni (aniqroq), keyin HTTP statusni
 * o'qiydi. Bu yerdagi HAR kod OpenAPI'ga chiqadi va frontend `errors.ts`
 * o'sha yerdan generatsiya qilinadi (qo'lda ikki joyda saqlanmaydi — ADR).
 *
 * `retryable` — UI "Qayta urinish" tugmasini ko'rsatadimi. 5xx odatda
 * o'tkinchi (retryable), 4xx — yo'q.
 */

export interface ErrorCodeMeta {
  httpStatus: number;
  retryable: boolean;
}

/**
 * Barcha domen kodlari. Frontend `LEGACY_CODES` + 7 ta GAP kod
 * (`CIRCUMVENTION_DETECTED`, `INVALID_CARD`, ...) + infra (`NOT_READY`).
 */
export const ERROR_CODES = {
  // ── Autentifikatsiya / sessiya (401) ──────────────────────────────────
  NO_SESSION: { httpStatus: 401, retryable: false },
  INVALID_CREDENTIALS: { httpStatus: 401, retryable: false },
  INVALID_CURRENT_PASSWORD: { httpStatus: 401, retryable: false },
  UNAUTHENTICATED: { httpStatus: 401, retryable: false },
  TOKEN_EXPIRED: { httpStatus: 401, retryable: false },
  TOKEN_REUSED: { httpStatus: 401, retryable: false },

  // ── Ruxsat (403) ──────────────────────────────────────────────────────
  FORBIDDEN: { httpStatus: 403, retryable: false },
  NOT_ALLOWED: { httpStatus: 403, retryable: false },
  ACCOUNT_BLOCKED: { httpStatus: 403, retryable: false },

  // ── Topilmadi (404) ──────────────────────────────────────────────────
  NOT_FOUND: { httpStatus: 404, retryable: false },
  USER_NOT_FOUND: { httpStatus: 404, retryable: false },
  CARD_NOT_FOUND: { httpStatus: 404, retryable: false },
  DISPUTE_NOT_FOUND: { httpStatus: 404, retryable: false },

  // ── O'chirilgan (410) ────────────────────────────────────────────────
  DELETED: { httpStatus: 410, retryable: false },

  // ── Holat / konflikt (409) ──────────────────────────────────────────
  BAD_STATE: { httpStatus: 409, retryable: false },
  INVALID_TRANSITION: { httpStatus: 409, retryable: false },
  DUPLICATE: { httpStatus: 409, retryable: false },
  DUPLICATE_OFFER: { httpStatus: 409, retryable: false },
  DUPLICATE_PROPOSAL: { httpStatus: 409, retryable: false },
  ALREADY_EXISTS: { httpStatus: 409, retryable: false },
  ALREADY_REVIEWED: { httpStatus: 409, retryable: false },
  ALREADY_PROCESSED: { httpStatus: 409, retryable: false },
  ALREADY_FUNDED: { httpStatus: 409, retryable: false }, // GAP kod
  ALREADY_CANCELLED: { httpStatus: 409, retryable: false }, // GAP kod
  NOT_PENDING: { httpStatus: 409, retryable: false }, // GAP kod
  REVISION_LIMIT_REACHED: { httpStatus: 409, retryable: false },
  PHONE_EXISTS: { httpStatus: 409, retryable: false },
  CARD_EXISTS: { httpStatus: 409, retryable: false },
  CARD_LIMIT: { httpStatus: 409, retryable: false },
  ACTIVE_CONTRACTS: { httpStatus: 409, retryable: false },
  HAS_SUBMITTED_WORK: { httpStatus: 409, retryable: false },
  SELF_LOCK: { httpStatus: 409, retryable: false },
  READ_ONLY: { httpStatus: 409, retryable: false },
  CIRCUMVENTION_DETECTED: { httpStatus: 409, retryable: false }, // GAP kod
  IDEMPOTENCY_CONFLICT: { httpStatus: 409, retryable: false },

  // ── Validatsiya (422) ──────────────────────────────────────────────
  VALIDATION: { httpStatus: 422, retryable: false },
  INVALID_INPUT: { httpStatus: 422, retryable: false },
  INVALID_AMOUNT: { httpStatus: 422, retryable: false },
  INVALID_NAME: { httpStatus: 422, retryable: false },
  INVALID_HOLDER: { httpStatus: 422, retryable: false },
  INVALID_DATE: { httpStatus: 422, retryable: false },
  INVALID_CODE: { httpStatus: 422, retryable: false },
  INVALID_CARD: { httpStatus: 422, retryable: false }, // GAP kod
  INVALID_EXPIRY: { httpStatus: 422, retryable: false }, // GAP kod
  INVALID_BANK_ACCOUNT: { httpStatus: 422, retryable: false }, // GAP kod
  WEAK_PASSWORD: { httpStatus: 422, retryable: false },
  EMPTY_MESSAGE: { httpStatus: 422, retryable: false },
  COMMENT_REQUIRED: { httpStatus: 422, retryable: false },
  REASON_REQUIRED: { httpStatus: 422, retryable: false },
  REPLY_REQUIRED: { httpStatus: 422, retryable: false },
  TOO_MANY_MILESTONES: { httpStatus: 422, retryable: false },
  INSUFFICIENT_BALANCE: { httpStatus: 422, retryable: false },
  NO_BALANCE: { httpStatus: 422, retryable: false },
  BELOW_MINIMUM: { httpStatus: 422, retryable: false },
  BELOW_MIN_PAYOUT: { httpStatus: 422, retryable: false },
  FILE_TOO_LARGE: { httpStatus: 422, retryable: false },
  FILE_TYPE_NOT_ALLOWED: { httpStatus: 422, retryable: false },
  FILE_READ_FAILED: { httpStatus: 422, retryable: false },

  // ── Rate limit (429) ──────────────────────────────────────────────
  RATE_LIMITED: { httpStatus: 429, retryable: true },

  // ── Kill-switch / imkoniyat o'chirilgan (503) ───────────────────
  PAYMENTS_PAUSED: { httpStatus: 503, retryable: true },
  FEATURE_DISABLED: { httpStatus: 503, retryable: false },
  OFFERS_DISABLED: { httpStatus: 503, retryable: false },
  REGISTRATION_PAUSED: { httpStatus: 503, retryable: false },
  CATEGORY_DISABLED: { httpStatus: 503, retryable: false },
  NOT_READY: { httpStatus: 503, retryable: true }, // /health/ready

  // ── Saqlash joyi (507) ──────────────────────────────────────────
  STORAGE_FULL: { httpStatus: 507, retryable: false },

  // ── Server / ichki invariant (500) ─────────────────────────────
  UNKNOWN: { httpStatus: 500, retryable: true },
  INVARIANT_VIOLATION: { httpStatus: 500, retryable: false },
} as const satisfies Record<string, ErrorCodeMeta>;

export type ErrorCode = keyof typeof ERROR_CODES;

export function errorCodeMeta(code: string): ErrorCodeMeta {
  return (ERROR_CODES as Record<string, ErrorCodeMeta>)[code] ?? ERROR_CODES.UNKNOWN;
}
