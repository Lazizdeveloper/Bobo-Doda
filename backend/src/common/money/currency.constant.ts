import { DomainError } from '@/common/errors/domain-error';

/**
 * Qo'llab-quvvatlanadigan valyutalar — bo'lim 43: "Currency conversion HOZIR
 * QILINMAYDI. Payment va Contract bir currency." v1 faqat UZS (`docs/01`
 * §0: "amount + currency doim juft. v1 faqat UZS") — `Contract.currency`/
 * `Service.currency` ham shu default bilan yaratiladi, boshqa qiymat
 * yaratish yo'li hozircha yo'q. Shunga qaramay tekshiruv AYTIB O'TILADI
 * (defensiv chegara — kelajakda ko'p valyuta ochilsa shu YAGONA joy
 * kengaytiriladi).
 */
export const SUPPORTED_PAYMENT_CURRENCIES = ['UZS'] as const;

export function assertSupportedCurrency(currency: string): void {
  if (!SUPPORTED_PAYMENT_CURRENCIES.includes(currency as (typeof SUPPORTED_PAYMENT_CURRENCIES)[number])) {
    throw new DomainError('PAYMENT_CURRENCY_MISMATCH', `Qo'llab-quvvatlanmaydigan valyuta: ${currency}`);
  }
}
