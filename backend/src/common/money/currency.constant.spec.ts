import { assertSupportedCurrency, SUPPORTED_PAYMENT_CURRENCIES } from './currency.constant';
import { DomainError } from '@/common/errors/domain-error';

describe('assertSupportedCurrency', () => {
  it('UZS — o‘tadi', () => {
    expect(() => assertSupportedCurrency('UZS')).not.toThrow();
  });

  it.each(['USD', 'KZT', 'uzs', ''])('qo‘llab-quvvatlanmaydigan valyuta (%s) — PAYMENT_CURRENCY_MISMATCH', (currency) => {
    expect(() => assertSupportedCurrency(currency)).toThrow(DomainError);
    try {
      assertSupportedCurrency(currency);
    } catch (err) {
      expect((err as DomainError).code).toBe('PAYMENT_CURRENCY_MISMATCH');
    }
  });

  it('v1 faqat UZS ro‘yxatida', () => {
    expect(SUPPORTED_PAYMENT_CURRENCIES).toEqual(['UZS']);
  });
});
