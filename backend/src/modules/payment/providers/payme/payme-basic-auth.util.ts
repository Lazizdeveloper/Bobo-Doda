/**
 * Bosqich 12, bo'lim 4/5 — Payme Business "Basic HTTP-authentication"
 * bilan bizga murojaat qiladi (`Authorization: Basic base64(login:key)`,
 * manba: `developer.help.paycom.uz/protokol-merchant-api/skhema-vzaimodeystviya/`).
 * Solishtirish timing-safe (`crypto.timingSafeEqual`) — parolni belgi-
 * belgi taqqoslashdan kelib chiqadigan timing-attack oldini oladi.
 * Ham `login`, ham `key` mos kelishi SHART.
 */
import { timingSafeEqual } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // Uzunlik oshkor bo'lishi mumkin (timing-safe compare buni yashira
  // olmaydi) — lekin uzunlik sirning o'zi emas, faqat teng bo'lmasa
  // darhol false: `timingSafeEqual` uzunlik mos kelmasa istisno tashlaydi.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** `Authorization` header'idan `{login,key}`ni ajratadi. Format xato bo'lsa `null`. */
export function parseBasicAuth(header: string | undefined): { login: string; key: string } | null {
  if (!header || !header.startsWith('Basic ')) return null;
  const encoded = header.slice('Basic '.length).trim();
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return null;
  return { login: decoded.slice(0, sep), key: decoded.slice(sep + 1) };
}

export function verifyPaymeBasicAuth(
  header: string | undefined,
  expected: { login: string; key: string },
): boolean {
  const parsed = parseBasicAuth(header);
  if (!parsed) return false;
  return safeEqual(parsed.login, expected.login) && safeEqual(parsed.key, expected.key);
}
