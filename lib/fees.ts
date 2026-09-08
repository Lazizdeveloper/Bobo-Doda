import { getPlatformSettings } from "@/lib/platform-settings";

/* Platforma xizmat haqi — YAGONA MANBA.
 *
 * Qoida: xaridor BEPUL. Xizmat haqi faqat mutaxassisdan, faqat QABUL QILINGAN
 * bosqichdan ushlanadi. Bosqich qabul qilinmasa — hech kim hech narsa to'lamaydi.
 */

export const PLATFORM_FEE_PERCENT = 5;

/** Dinamik komissiya foizi (admin sozlamalaridan o'qiladi, fallback 5) */
export function getPlatformFeePercent(): number {
  if (typeof window !== "undefined") {
    try {
      const s = getPlatformSettings();
      if (typeof s.platformCommissionPercent === "number" && s.platformCommissionPercent >= 0) {
        return s.platformCommissionPercent;
      }
    } catch {
      // ignore
    }
  }
  return PLATFORM_FEE_PERCENT;
}

/** Bitta bosqich (yoki jami) summasidan ushlanadigan xizmat haqi.
    Butun songa yaxlitlanadi — UZS'da tiyin ishlatilmaydi. */
export function platformFee(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return Math.round((gross * getPlatformFeePercent()) / 100);
}

/** Mutaxassis qo'liga tegadigan sof summa. */
export function sellerNet(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return gross - platformFee(gross);
}

