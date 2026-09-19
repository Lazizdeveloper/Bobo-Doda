import { toTextUpDestination } from './textup-phone.util';
import { DomainError } from '@/common/errors/domain-error';

describe('toTextUpDestination', () => {
  it('yaroqli UZ E.164 raqamini o‘zgartirmasdan qaytaradi', () => {
    expect(toTextUpDestination('+998901234567')).toBe('+998901234567');
  });

  it('`+` belgisiz raqamni rad etadi (E.164 emas)', () => {
    expect(() => toTextUpDestination('998901234567')).toThrow(DomainError);
  });

  it('UZ bo‘lmagan raqamni rad etadi', () => {
    expect(() => toTextUpDestination('+77012345678')).toThrow(DomainError);
  });
});
