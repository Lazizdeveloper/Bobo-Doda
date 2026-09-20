import { DomainError } from '@/common/errors/domain-error';

export type ProviderQueryErrorClass = 'AMBIGUOUS' | 'CONFIG';

const AMBIGUOUS_CODES = new Set(['PAYMENT_PROVIDER_UNAVAILABLE', 'PAYOUT_PROVIDER_UNAVAILABLE']);

/**
 * Bo'lim 32/35 — provider query xatosini ikkita sinfga ajratadi:
 *  - `AMBIGUOUS` (timeout/tarmoq) — vaqtinchalik, keyingi urinishda
 *    tuzalishi MUMKIN, batch DAVOM ETADI (bo'lim 54 — bitta buzilgan
 *    operatsiya butun batch'ni yiqitmasin).
 *  - `CONFIG` (auth/credentials) — qayta urinish YORDAM BERMAYDI, JORIY
 *    batch ATAYLAB to'xtatiladi (bo'lim 35 — "1000 operationni qayta-qayta
 *    query qilma").
 *
 * Boshqa (tasniflanmagan) xato — `null` qaytaradi, chaqiruvchi uni QAYTA
 * TASHLAYDI (kutilmagan xatoni jimgina yutish YO'Q).
 */
export function classifyProviderQueryError(err: unknown): ProviderQueryErrorClass | null {
  if (!(err instanceof DomainError)) return null;
  if (AMBIGUOUS_CODES.has(err.code)) return 'AMBIGUOUS';
  if (err.code === 'PROVIDER_CONFIG_ERROR') return 'CONFIG';
  return null;
}
