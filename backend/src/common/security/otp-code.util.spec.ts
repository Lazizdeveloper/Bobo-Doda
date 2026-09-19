import { generateOtpCode } from './otp-code.util';

describe('generateOtpCode', () => {
  it('doim 6 ta raqamdan iborat satr (padStart — "000123" kabi yetakchi nollar saqlanadi)', () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('taqsimot — bir nechta turli qiymat chiqadi (doim bir xil emas)', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(50); // kollizyon bo'lishi mumkin, lekin bir xillik EMAS
  });
});
