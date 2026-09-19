import type { CookieOptions, Response } from 'express';
import { parseDurationMs } from '@/common/security/duration.util';

/** Marketplace'dan ATAYLAB boshqa nom/yo'l — ikkala cookie bir-biriga aralashmasin. */
export const STAFF_REFRESH_COOKIE_NAME = 'staff_refresh_token';
const COOKIE_PATH = '/api/v1/staff/auth';

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
