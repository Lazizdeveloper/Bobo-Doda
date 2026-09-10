import { ERROR_CODES, type ErrorCode, errorCodeMeta } from './error-codes';

/**
 * Domen xatosi — `throw new Error('xato')` YOZILMAYDI (kod uslubi qoidasi).
 * Global `AllExceptionsFilter` buni `{ code, message, fieldErrors? }` + to'g'ri
 * HTTP status'ga aylantiradi.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;
  /** Faqat log uchun — foydalanuvchiga ko'rsatilmaydi. */
  readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      fieldErrors?: Record<string, string>;
      context?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(message ?? code, options?.cause ? { cause: options.cause } : undefined);
    const meta = errorCodeMeta(code);
    this.name = 'DomainError';
    this.code = code;
    this.httpStatus = meta.httpStatus;
    this.retryable = meta.retryable;
    this.fieldErrors = options?.fieldErrors;
    this.context = options?.context;
  }
}

/* ── Ko'p ishlatiladigan qisqartmalar ──────────────────────────────────── */

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Autentifikatsiya talab qilinadi', code: ErrorCode = 'UNAUTHENTICATED') {
    super(code, message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Ruxsat yo’q', code: ErrorCode = 'FORBIDDEN') {
    super(code, message);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Topilmadi', code: ErrorCode = 'NOT_FOUND') {
    super(code, message);
  }
}

export class ConflictError extends DomainError {
  constructor(code: ErrorCode = 'DUPLICATE', message = 'Konflikt') {
    super(code, message);
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(
    from: string,
    to: string,
    machine: string,
    message = `Noto’g’ri o’tish: ${machine} ${from} → ${to}`,
  ) {
    super('INVALID_TRANSITION', message, { context: { from, to, machine } });
  }
}

/** class-validator natijasi — maydon-darajali xatolar bilan. */
export class ValidationDomainError extends DomainError {
  constructor(fieldErrors: Record<string, string>, message = 'Validatsiya muvaffaqiyatsiz') {
    super('VALIDATION', message, { fieldErrors });
  }
}

/**
 * Ledger / moliyaviy invariant buzildi (masalan `LedgerEntry` yig'indisi ≠ 0,
 * yoki `amount % 100 !== 0`). Bu HECH QACHON foydalanuvchi xatosi emas —
 * tranzaksiya rollback bo'ladi va alert chiqadi.
 */
export class InvariantViolationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('INVARIANT_VIOLATION', message, { context });
  }
}

export { ERROR_CODES };
