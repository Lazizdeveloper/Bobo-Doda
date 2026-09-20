import { DomainError } from '@/common/errors/domain-error';

/**
 * TextUp `destination` maydoni — foydalanuvchi spetsifikatsiyasi va
 * `textup.uz`dagi rasmiy misol: `"+998901234567"` (E.164, `+` bilan) —
 * bizning ichki `normalizePhone()` natijasi bilan BIR XIL format, PlayMobile
 * (`+` olib tashlanadi) dan farqli. Shuning uchun bu funksiya transformatsiya
 * QILMAYDI — faqat UZ raqamiga mosligini tasdiqlaydi (PlayMobile provider
 * bilan bir xil chegara — production'da hozircha faqat UZ raqamlar
 * yetkaziladi). Boshqa format kerakligi ANIQ TextUp javobi bilan
 * isbotlanmaguncha o'zgartirilmasin (bo'lim 4).
 */
export function toTextUpDestination(e164Phone: string): string {
  if (!/^\+998\d{9}$/.test(e164Phone)) {
    throw new DomainError('INVALID_INPUT', 'Telefon raqami TextUp formatiga mos emas', {
      context: { phone: e164Phone },
    });
  }
  return e164Phone;
}
