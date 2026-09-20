import { DomainError } from '@/common/errors/domain-error';

/**
 * Bo'lim 2.1.2.6 — rasmiy format: "строго в формате 9989xxxxxxx, без
 * пробелов и без знака +". Bizning ichki qatlam (`normalizePhone`)
 * E.164 qaytaradi (`+998901234567`) — bu yerda FAQAT PlayMobile uchun
 * `+` olib tashlanadi (boshqa hech qayerga tarqatilmaydigan, provider-
 * specific format).
 */
export function toPlayMobileRecipient(e164Phone: string): string {
  const digits = e164Phone.replace(/^\+/, '');
  if (!/^998\d{9}$/.test(digits)) {
    throw new DomainError('INVALID_INPUT', 'Telefon raqami PlayMobile formatiga mos emas', {
      context: { phone: e164Phone },
    });
  }
  return digits;
}
