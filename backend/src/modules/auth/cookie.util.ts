import type { CookieOptions, Response } from 'express';
import { parseDurationMs } from '@/common/security/duration.util';
import { API_GLOBAL_PREFIX } from '@/config/api-prefix';

export const REFRESH_COOKIE_NAME = 'refresh_token';
/** Cookie faqat `/auth` ostidagi marshrutlarga yuboriladi — boshqa har
 * so'rovda tashilib yurmasin (kichik yuzani kamaytirish).
 *
 * `API_GLOBAL_PREFIX`dan OLINADI (qattiq yozilmagan) — bo'lim 25 cross-review
 * topilmasi: bu literal ilgari mustaqil ravishda '/api/v1/auth' deb yozilgan
 * edi. Prefiks o'zgarsa-yu bu yer unutilsa, brauzer eski yo'lga cookie
 * yubormay qo'yardi — HECH QANDAY xato/404 chiqmasdan, chunki bu OpenAPI
 * hujjatida umuman ko'rinmaydigan sirtqi qiymat (contract drift gate buni
 * TUTOLMAYDI). */
const COOKIE_PATH = `/${API_GLOBAL_PREFIX}/auth`;

function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'strict', path: COOKIE_PATH };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  refreshTtl: string,
  secure: boolean,
): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions(secure),
    maxAge: parseDurationMs(refreshTtl),
  });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions(secure));
}
