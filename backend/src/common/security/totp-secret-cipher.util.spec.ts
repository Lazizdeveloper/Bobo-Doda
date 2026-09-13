import { randomBytes } from 'node:crypto';
import { decryptTotpSecret, encryptTotpSecret, parseTotpEncryptionKey } from './totp-secret-cipher.util';
import { generateTotpSecret } from './totp.util';

const KEY = randomBytes(32);

describe('totp-secret-cipher', () => {
  it('encrypt → decrypt ASL qiymatni qaytaradi', () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret, KEY);
    expect(encrypted).not.toBe(secret);
    expect(decryptTotpSecret(encrypted, KEY)).toBe(secret);
  });

  it('format "v1:" prefiks bilan boshlanadi', () => {
    const encrypted = encryptTotpSecret(generateTotpSecret(), KEY);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted.split(':')).toHaveLength(4);
  });

  it('har chaqiruvda BOSHQA ciphertext (tasodifiy IV) — lekin ikkalasi ham to‘g‘ri decrypt bo‘ladi', () => {
    const secret = generateTotpSecret();
    const a = encryptTotpSecret(secret, KEY);
    const b = encryptTotpSecret(secret, KEY);
    expect(a).not.toBe(b);
    expect(decryptTotpSecret(a, KEY)).toBe(secret);
    expect(decryptTotpSecret(b, KEY)).toBe(secret);
  });

  it('noto‘g‘ri kalit bilan decrypt qilishga urinish — Error (authenticated encryption: buzilish aniqlanadi)', () => {
    const encrypted = encryptTotpSecret(generateTotpSecret(), KEY);
    const wrongKey = randomBytes(32);
    expect(() => decryptTotpSecret(encrypted, wrongKey)).toThrow();
  });

  it('buzilgan ciphertext (bitta hex belgi o‘zgartirilgan) — Error (GCM auth tag mos kelmaydi)', () => {
    const encrypted = encryptTotpSecret(generateTotpSecret(), KEY);
    const parts = encrypted.split(':');
    const tampered = [...parts];
    tampered[3] = (tampered[3]![0] === '0' ? '1' : '0') + tampered[3]!.slice(1);
    expect(() => decryptTotpSecret(tampered.join(':'), KEY)).toThrow();
  });

  it('noma‘lum format versiyasi — Error', () => {
    expect(() => decryptTotpSecret('v2:aa:bb:cc', KEY)).toThrow();
  });

  it('buzilgan qator (segment yetishmayapti) — Error', () => {
    expect(() => decryptTotpSecret('v1:aa:bb', KEY)).toThrow();
  });

  it('parseTotpEncryptionKey — 64 hex belgidan boshqa uzunlikni rad etadi', () => {
    expect(() => parseTotpEncryptionKey('aa')).toThrow();
    expect(parseTotpEncryptionKey('a'.repeat(64))).toHaveLength(32);
  });
});
