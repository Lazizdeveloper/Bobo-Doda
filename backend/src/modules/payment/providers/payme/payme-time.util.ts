/**
 * Bosqich 12, bo'lim 22 — Payme'ning barcha vaqt maydonlari (`time`, `from`,
 * `to`) millisekund Unix epoch (`number`). Ichki DB — `timestamptz` (UTC).
 * Xavfsiz parser: `NaN`/manfiy/haddan tashqari katta (overflow) qiymatlar
 * rad etiladi — `new Date(NaN)` kabi "silent invalid date" IMKONSIZ.
 */
import { PaymeRpcError } from './payme-rpc-error';
import { PAYME_ERROR } from './payme-rpc.types';

/** 2200-01-01 — "haqiqiy emas, lekin JS Date uchun texnik jihatdan valid" qiymatlarni kesish uchun oqilona yuqori chegara. */
const MAX_REASONABLE_MS = 7_258_118_400_000;

export function parsePaymeTimestampMs(value: unknown, field: string): Date {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new PaymeRpcError(PAYME_ERROR.INVALID_REQUEST, `"${field}" — noto‘g‘ri vaqt formati`);
  }
  if (value <= 0 || value > MAX_REASONABLE_MS) {
    throw new PaymeRpcError(PAYME_ERROR.INVALID_REQUEST, `"${field}" — vaqt oralig‘idan tashqari`);
  }
  return new Date(value);
}

export function dateToPaymeTimestampMs(date: Date): number {
  return date.getTime();
}
