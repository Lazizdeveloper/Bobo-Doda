/* Platforma xizmat haqi — YAGONA MANBA.
 *
 * Bu raqam foydalanuvchiga uchta joyda va'da qilinadi: landing (narxlar bo'limi),
 * `lib/faq-content.ts` va `lib/help-articles.ts`. Ilova hisob-kitobi ham aynan
 * shu yerdan o'qishi shart — aks holda va'da qilingan foiz bilan ekrandagi
 * summa mos kelmaydi (ishonchga qurilgan mahsulotda bu eng og'ir xato).
 *
 * Qoida: xaridor BEPUL. Xizmat haqi faqat mutaxassisdan, faqat QABUL QILINGAN
 * bosqichdan ushlanadi. Bosqich qabul qilinmasa — hech kim hech narsa to'lamaydi.
 */

export const PLATFORM_FEE_PERCENT = 5;

/** Bitta bosqich (yoki jami) summasidan ushlanadigan xizmat haqi.
    Butun songa yaxlitlanadi — UZS'da tiyin ishlatilmaydi. */
export function platformFee(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return Math.round((gross * PLATFORM_FEE_PERCENT) / 100);
}

/** Mutaxassis qo'liga tegadigan sof summa. */
export function sellerNet(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return gross - platformFee(gross);
}
