import { shouldExposeDevOtp } from './dev-otp.util';

describe('shouldExposeDevOtp — uch qatlamli fail-closed shart', () => {
  it('development + CONSOLE + DEV_EXPOSE_OTP=true → true', () => {
    expect(
      shouldExposeDevOtp({ isProduction: false, smsProvider: 'CONSOLE', devExposeOtp: true }),
    ).toBe(true);
  });

  it('development + CONSOLE + DEV_EXPOSE_OTP=false → false', () => {
    expect(
      shouldExposeDevOtp({ isProduction: false, smsProvider: 'CONSOLE', devExposeOtp: false }),
    ).toBe(false);
  });

  it('development + PLAYMOBILE (devExposeOtp=true bo‘lsa ham) → false', () => {
    expect(
      shouldExposeDevOtp({ isProduction: false, smsProvider: 'PLAYMOBILE', devExposeOtp: true }),
    ).toBe(false);
  });

  it('production + CONSOLE + DEV_EXPOSE_OTP=true → false (production HAR DOIM yutadi)', () => {
    expect(
      shouldExposeDevOtp({ isProduction: true, smsProvider: 'CONSOLE', devExposeOtp: true }),
    ).toBe(false);
  });

  it('production + PLAYMOBILE + DEV_EXPOSE_OTP=true → false', () => {
    expect(
      shouldExposeDevOtp({ isProduction: true, smsProvider: 'PLAYMOBILE', devExposeOtp: true }),
    ).toBe(false);
  });

  it('production + PLAYMOBILE + DEV_EXPOSE_OTP=false → false', () => {
    expect(
      shouldExposeDevOtp({ isProduction: true, smsProvider: 'PLAYMOBILE', devExposeOtp: false }),
    ).toBe(false);
  });

  it('Bosqich 23 — development + TEXTUP (devExposeOtp=true bo‘lsa ham) → false — haqiqiy SMS kelishi kerak', () => {
    expect(
      shouldExposeDevOtp({ isProduction: false, smsProvider: 'TEXTUP', devExposeOtp: true }),
    ).toBe(false);
  });

  it('Bosqich 23 — production + TEXTUP + DEV_EXPOSE_OTP=true → false', () => {
    expect(
      shouldExposeDevOtp({ isProduction: true, smsProvider: 'TEXTUP', devExposeOtp: true }),
    ).toBe(false);
  });
});
