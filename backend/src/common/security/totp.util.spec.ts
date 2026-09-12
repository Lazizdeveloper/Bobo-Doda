import { buildOtpauthUri, generateTotp, generateTotpSecret, verifyTotp } from './totp.util';

describe('totp.util (RFC 6238)', () => {
  it('generateTotp/verifyTotp — round-trip to‘g‘ri kod tasdiqlanadi', () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('noto‘g‘ri kod rad etiladi', () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    const wrong = code === '000000' ? '111111' : '000000';
    expect(verifyTotp(secret, wrong)).toBe(false);
  });

  it('boshqa sir bilan yaratilgan kod tasdiqlanmaydi', () => {
    const secretA = generateTotpSecret();
    const secretB = generateTotpSecret();
    const codeA = generateTotp(secretA);
    expect(verifyTotp(secretB, codeA)).toBe(false);
  });

  it('vaqt oynasi (±30s) — bir qadam oldingi/keyingi kod ±1 window bilan hali qabul qilinadi', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const prevStepCode = generateTotp(secret, now - 30_000);
    expect(verifyTotp(secret, prevStepCode, { timeMs: now })).toBe(true);
  });

  it('oyna tashqarisidagi (±2 qadam) kod rad etiladi', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const farCode = generateTotp(secret, now - 120_000); // 4 qadam oldin
    expect(verifyTotp(secret, farCode, { timeMs: now })).toBe(false);
  });

  it('formatga mos kelmagan kod (uzunlik/harf) rad etiladi, tashlamaydi', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, '12345')).toBe(false);
    expect(verifyTotp(secret, 'abcdef')).toBe(false);
  });

  it('buildOtpauthUri — otpauth://totp/ bilan boshlanadi, sir/issuer query’da', () => {
    const secret = generateTotpSecret();
    const uri = buildOtpauthUri({ secret, accountLabel: 'admin@bobododa.uz', issuer: 'Bobo&Doda' });
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`secret=${secret}`);
  });

  it('generateTotpSecret — har chaqiruvda noyob Base32 satr', () => {
    const secrets = new Set(Array.from({ length: 100 }, () => generateTotpSecret()));
    expect(secrets.size).toBe(100);
    for (const s of secrets) expect(s).toMatch(/^[A-Z2-7]+$/);
  });
});
