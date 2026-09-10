import { ERROR_CODES, errorCodeMeta } from './error-codes';
import {
  DomainError,
  ValidationDomainError,
  InvalidTransitionError,
  NotFoundError,
  InvariantViolationError,
} from './domain-error';

const ALLOWED_STATUSES = new Set([400, 401, 403, 404, 409, 410, 422, 429, 503, 507, 500]);

describe('ERROR_CODES taksonomiyasi', () => {
  it('har kod frontend `lib/api/errors.ts` qo’llaydigan statusga tegishli', () => {
    for (const [code, meta] of Object.entries(ERROR_CODES)) {
      expect(ALLOWED_STATUSES.has(meta.httpStatus)).toBe(true);
      expect(typeof meta.retryable).toBe('boolean');
      // 4xx odatda retryable EMAS (429 istisno); 5xx odatda retryable.
      if (meta.httpStatus >= 400 && meta.httpStatus < 500 && meta.httpStatus !== 429) {
        expect(meta.retryable).toBe(false);
      }
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/); // UPPER_SNAKE
    }
  });

  it('GAP kodlari kiritilgan (ADR: backend manba)', () => {
    for (const code of [
      'CIRCUMVENTION_DETECTED',
      'INVALID_CARD',
      'INVALID_EXPIRY',
      'INVALID_BANK_ACCOUNT',
      'ALREADY_FUNDED',
      'NOT_PENDING',
      'ALREADY_CANCELLED',
    ]) {
      expect(ERROR_CODES).toHaveProperty(code);
    }
  });

  it('frontend LEGACY_CODES ning har biri mavjud', () => {
    for (const code of [
      'NO_SESSION',
      'INVALID_CREDENTIALS',
      'FORBIDDEN',
      'ACCOUNT_BLOCKED',
      'NOT_FOUND',
      'BAD_STATE',
      'DUPLICATE_OFFER',
      'PHONE_EXISTS',
      'CARD_LIMIT',
      'ACTIVE_CONTRACTS',
      'HAS_SUBMITTED_WORK',
      'VALIDATION',
      'WEAK_PASSWORD',
      'TOO_MANY_MILESTONES',
      'BELOW_MIN_PAYOUT',
      'PAYMENTS_PAUSED',
      'OFFERS_DISABLED',
      'REGISTRATION_PAUSED',
      'CATEGORY_DISABLED',
      'STORAGE_FULL',
    ]) {
      expect(ERROR_CODES).toHaveProperty(code);
    }
  });

  it('noma’lum kod UNKNOWN/500 ga tushadi', () => {
    expect(errorCodeMeta('NOPE_NOT_A_CODE')).toEqual({ httpStatus: 500, retryable: true });
  });
});

describe('DomainError', () => {
  it('kod meta’sini oladi', () => {
    const err = new DomainError('PHONE_EXISTS', 'Raqam band');
    expect(err.code).toBe('PHONE_EXISTS');
    expect(err.httpStatus).toBe(409);
    expect(err.retryable).toBe(false);
    expect(err.message).toBe('Raqam band');
  });

  it('message berilmasa kod matn bo’ladi', () => {
    expect(new DomainError('NOT_FOUND').message).toBe('NOT_FOUND');
  });

  it('ValidationDomainError fieldErrors bilan', () => {
    const err = new ValidationDomainError({ phone: 'Majburiy' });
    expect(err.code).toBe('VALIDATION');
    expect(err.httpStatus).toBe(422);
    expect(err.fieldErrors).toEqual({ phone: 'Majburiy' });
  });

  it('InvalidTransitionError 409 + kontekst', () => {
    const err = new InvalidTransitionError('SIGNED', 'COMPLETED', 'contract');
    expect(err.code).toBe('INVALID_TRANSITION');
    expect(err.httpStatus).toBe(409);
    expect(err.context).toMatchObject({ from: 'SIGNED', to: 'COMPLETED', machine: 'contract' });
  });

  it('NotFoundError default va maxsus kod', () => {
    expect(new NotFoundError().code).toBe('NOT_FOUND');
    expect(new NotFoundError('Karta yo’q', 'CARD_NOT_FOUND').code).toBe('CARD_NOT_FOUND');
  });

  it('InvariantViolationError 500 + retryable=false', () => {
    const err = new InvariantViolationError('yig’indi ≠ 0', { txId: 'x' });
    expect(err.code).toBe('INVARIANT_VIOLATION');
    expect(err.httpStatus).toBe(500);
    expect(err.retryable).toBe(false);
  });
});
