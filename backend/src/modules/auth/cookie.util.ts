import type { CookieOptions, Response } from 'express';
import { parseDurationMs } from '@/common/security/duration.util';

export const REFRESH_COOKIE_NAME = 'refresh_token';
/** Cookie faqat `/auth` ostidagi marshrutlarga yuboriladi — boshqa har
 * so'rovda tashilib yurmasin (kichik yuzani kamaytirish). */
const COOKIE_PATH = '/api/v1/auth';

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
