import type { CookieOptions, Response } from 'express';
import { parseDurationMs } from '@/common/security/duration.util';
import { API_GLOBAL_PREFIX } from '@/config/api-prefix';

/** Marketplace'dan ATAYLAB boshqa nom/yo'l — ikkala cookie bir-biriga aralashmasin.
 * `API_GLOBAL_PREFIX`dan olinadi — `backend/src/modules/auth/cookie.util.ts`
 * dagi izohga qarang (bo'lim 25 cross-review topilmasi). */
export const STAFF_REFRESH_COOKIE_NAME = 'staff_refresh_token';
const COOKIE_PATH = `/${API_GLOBAL_PREFIX}/staff/auth`;

function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'strict', path: COOKIE_PATH };
}

export function setStaffRefreshCookie(
  res: Response,
  token: string,
  refreshTtl: string,
  secure: boolean,
): void {
  res.cookie(STAFF_REFRESH_COOKIE_NAME, token, {
    ...baseOptions(secure),
    maxAge: parseDurationMs(refreshTtl),
  });
}

export function clearStaffRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(STAFF_REFRESH_COOKIE_NAME, baseOptions(secure));
}
