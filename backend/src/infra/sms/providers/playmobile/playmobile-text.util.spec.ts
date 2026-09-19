import { renderPlayMobileText } from './playmobile-text.util';
import { OTP_SMS_TEMPLATE } from '@/modules/auth/constants/otp.constants';
import { DomainError } from '@/common/errors/domain-error';

describe('renderPlayMobileText', () => {
  it('OTP shabloni — kod matnga qo‘shiladi', () => {
    const text = renderPlayMobileText(OTP_SMS_TEMPLATE, { code: '123456' });
    expect(text).toContain('123456');
  });

  it('OTP shabloni, code yo‘q — DomainError', () => {
    expect(() => renderPlayMobileText(OTP_SMS_TEMPLATE, {})).toThrow(DomainError);
  });

  it('Outbox shabloni (message allaqachon tayyor) — o‘zgarishsiz qaytadi', () => {
    expect(renderPlayMobileText('USER_BLOCKED', { message: 'Hisobingiz bloklandi' })).toBe('Hisobingiz bloklandi');
  });

  it('Outbox shabloni, message yo‘q — DomainError', () => {
    expect(() => renderPlayMobileText('USER_BLOCKED', {})).toThrow(DomainError);
  });
});
