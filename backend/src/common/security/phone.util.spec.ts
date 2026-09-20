import { normalizePhone } from './phone.util';
import { DomainError } from '@/common/errors/domain-error';

describe('normalizePhone', () => {
  it.each([
    ['+998901234567', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['901234567', '+998901234567'],
    ['+998 90 123-45-67', '+998901234567'],
    ['  +998901234567  ', '+998901234567'],
  ])('%s → %s (E.164)', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('turli formatdagi bir xil raqam — bir xil E.164 natija (bir xil foydalanuvchi)', () => {
    const a = normalizePhone('+998901234567');
    const b = normalizePhone('901234567');
    expect(a).toBe(b);
  });

  it('yaroqsiz raqam — DomainError(INVALID_INPUT), fieldErrors.phone bilan', () => {
    expect(() => normalizePhone('123')).toThrow(DomainError);
    try {
      normalizePhone('123');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe('INVALID_INPUT');
      expect((err as DomainError).fieldErrors?.phone).toBeDefined();
    }
  });

  it('bo‘sh satr — DomainError', () => {
    expect(() => normalizePhone('')).toThrow(DomainError);
  });
});
