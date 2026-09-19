import { DomainError } from '@/common/errors/domain-error';
import { classifyProviderQueryError } from './provider-error.util';

describe('classifyProviderQueryError', () => {
  it('PAYMENT_PROVIDER_UNAVAILABLE — AMBIGUOUS', () => {
    expect(classifyProviderQueryError(new DomainError('PAYMENT_PROVIDER_UNAVAILABLE', 'x'))).toBe('AMBIGUOUS');
  });

  it('PAYOUT_PROVIDER_UNAVAILABLE — AMBIGUOUS', () => {
    expect(classifyProviderQueryError(new DomainError('PAYOUT_PROVIDER_UNAVAILABLE', 'x'))).toBe('AMBIGUOUS');
  });

  it('PROVIDER_CONFIG_ERROR — CONFIG', () => {
    expect(classifyProviderQueryError(new DomainError('PROVIDER_CONFIG_ERROR', 'x'))).toBe('CONFIG');
  });

  it('tasniflanmagan DomainError — null (chaqiruvchi qayta tashlaydi)', () => {
    expect(classifyProviderQueryError(new DomainError('PAYMENT_NOT_FOUND', 'x'))).toBeNull();
  });

  it('DomainError bo‘lmagan xato — null', () => {
    expect(classifyProviderQueryError(new Error('boom'))).toBeNull();
    expect(classifyProviderQueryError('string xato')).toBeNull();
    expect(classifyProviderQueryError(undefined)).toBeNull();
  });
});
