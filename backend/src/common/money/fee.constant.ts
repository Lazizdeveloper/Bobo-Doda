/**
 * Platforma komissiyasi — Bosqich 4 (Contract) da FAQAT snapshot uchun.
 * Haqiqiy `PlatformFeeConfig` (ADR-05: runtime, versiyalangan, staff
 * `SETTINGS`+`SUPER_ADMIN` orqali o'zgartiriladi) hali YO'Q — bu keyingi
 * moliyaviy bosqichning ishi. Hozircha bitta qattiq stavka, frontend
 * `lib/fees.ts#PLATFORM_FEE_PERCENT = 5` bilan BIR XIL (5% = 500 bps).
 *
 * `Contract.platformFeeRateBpsSnapshot` shu qiymatdan yoziladi — pul
 * HARAKATI yo'q (Bosqich 4'da to'lov mavjud emas), FAQAT informatsion/
 * kelajakdagi hisob-kitob uchun tayyorgarlik.
 */
export const PLATFORM_FEE_RATE_BPS = 500;

/** Floor yaxlitlash (ADR-01) — qoldiq har doim platformaga (keyingi bosqichda `PLATFORM_REVENUE`ga) ketadi. */
export function computePlatformFee(agreedAmountTiyin: bigint, rateBps: number): bigint {
  return (agreedAmountTiyin * BigInt(rateBps)) / 10_000n;
}
