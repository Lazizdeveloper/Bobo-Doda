import { toPlayMobileRecipient } from './playmobile-phone.util';
import { DomainError } from '@/common/errors/domain-error';

describe('toPlayMobileRecipient', () => {
  it('E.164 (+998...) — "+" olib tashlanadi', () => {
    expect(toPlayMobileRecipient('+998901234567')).toBe('998901234567');
  });

  it('998 bilan boshlanmasa — DomainError', () => {
    expect(() => toPlayMobileRecipient('+1234567890')).toThrow(DomainError);
  });

  it('uzunlik noto‘g‘ri bo‘lsa — DomainError', () => {
    expect(() => toPlayMobileRecipient('+99890123')).toThrow(DomainError);
    expect(() => toPlayMobileRecipient('+9989012345678')).toThrow(DomainError);
  });
});
