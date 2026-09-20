/**
 * Staff auth/TOTP siyosati — YAGONA MANBA (Bosqich 11, bo'lim 42/45).
 * `OtpService`'ning rate-limit naqshi bilan bir xil (`RateLimiterService`).
 */

/** Bo'lim 42 — parol bilan login, bitta email uchun oynadagi eng ko'p urinish. */
export const STAFF_LOGIN_EMAIL_MAX_ATTEMPTS = 10;
export const STAFF_LOGIN_EMAIL_WINDOW_SECONDS = 15 * 60;

/** Bo'lim 42 — bitta IP uchun (ko'p email sinash himoyasi). */
export const STAFF_LOGIN_IP_MAX_ATTEMPTS = 30;
export const STAFF_LOGIN_IP_WINDOW_SECONDS = 15 * 60;

/** Bo'lim 45 — TOTP kod urinishi (login, enrollment verify, disable — HAMMASI shu BITTA hisoblagichni bo'lishadi, staffId bo'yicha). */
export const STAFF_TOTP_MAX_ATTEMPTS = 5;
export const STAFF_TOTP_WINDOW_SECONDS = 5 * 60;

/** Bo'lim 8 — pending TOTP enrollment muddati (shuncha vaqt ichida verify qilinmasa yaroqsiz). */
export const STAFF_TOTP_ENROLLMENT_TTL_SECONDS = 10 * 60;

/** Bo'lim 43 — parol siyosati. Composition-fetish qoidalari YO'Q (uzunlik yetarli). */
export const STAFF_PASSWORD_MIN_LENGTH = 10;
/** Argon2 DoS himoyasi — cheksiz uzun kirish hash CPU vaqtini chizada oshiradi. */
export const STAFF_PASSWORD_MAX_LENGTH = 128;

export const TOTP_ISSUER = 'Bobo&Doda Admin';
