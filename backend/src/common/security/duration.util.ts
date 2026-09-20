/**
 * `"15m"`, `"30d"`, `"8h"` kabi oddiy muddat yozuvini millisekundga
 * aylantiradi. `env.schema.ts`dagi JWT TTL'lar shu formatda — `@nestjs/jwt`
 * (`expiresIn`) xom satrni o'zi qabul qiladi, lekin `RefreshToken.expiresAt`
 * (DB'ga yoziladigan `Date`) hisoblash uchun sonli qiymat kerak.
 */
const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(spec: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(spec.trim());
  if (!match) {
    throw new Error(`parseDurationMs: noto'g'ri format "${spec}" (masalan "15m", "30d")`);
  }
  const amountStr = match[1]!;
  const unit = match[2]!;
  return Number(amountStr) * UNIT_MS[unit]!;
}
