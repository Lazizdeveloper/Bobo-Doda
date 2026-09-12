import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238, HOTP-SHA1 asosida — RFC 4226). Yangi kutubxona QO'SHILMAGAN
 * — algoritm kichik va to'liq o'zi yetarli (Base32 + HMAC-SHA1 + kesish).
 *
 * Bosqich 2 qamrovi: FAQAT login vaqtidagi tekshiruv (`verifyTotp`) va
 * sir generatsiyasi. Ro'yxatdan o'tish (QR/enroll) ekrani — Bosqich 11
 * (Admin APIs, staff profil boshqaruvi)ga qoldirilgan — ATAYLAB: bu
 * o'z-o'ziga xizmat qulayligi, autentifikatsiya CORRECTNESS'iga
 * bevosita ta'sir qilmaydi (Phase 2 hisobotida qayd etiladi).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('base32Decode: yaroqsiz Base32 belgi');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  // Node'ning `writeBigUInt64BE` — counter musbat va 2^53'dan kichik (bu
  // yerda amaliy jihatdan doim shunday, 30s qadam bilan Unix vaqtidan).
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Yangi Base32 sir (160 bit, RFC tavsiyasi). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function generateTotp(base32Secret: string, timeMs = Date.now()): string {
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(base32Secret), counter);
}

/**
 * `window` — necha qadam oldinga/orqaga toleratsiya (soat sinxron emasligi
 * uchun). Sukut 1 = ±30s. Taqqoslash `timingSafeEqual` bilan (timing
 * hujumidan himoya).
 */
export function verifyTotp(
  base32Secret: string,
  code: string,
  opts?: { window?: number; timeMs?: number },
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const window = opts?.window ?? 1;
  const timeMs = opts?.timeMs ?? Date.now();
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS);
  const secretBuf = base32Decode(base32Secret);
  const codeBuf = Buffer.from(code);

  for (let delta = -window; delta <= window; delta++) {
    const candidate = Buffer.from(hotp(secretBuf, counter + delta));
    if (timingSafeEqual(candidate, codeBuf)) return true;
  }
  return false;
}

/** Google Authenticator va sh.k. autentifikator ilovalari uchun provisioning URI. */
export function buildOtpauthUri(params: { secret: string; accountLabel: string; issuer: string }): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountLabel}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
