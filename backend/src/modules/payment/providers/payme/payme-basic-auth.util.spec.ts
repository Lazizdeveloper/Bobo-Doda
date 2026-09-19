import { parseBasicAuth, verifyPaymeBasicAuth } from './payme-basic-auth.util';

function basic(login: string, key: string): string {
  return `Basic ${Buffer.from(`${login}:${key}`, 'utf8').toString('base64')}`;
}

describe('payme-basic-auth.util', () => {
  const expected = { login: 'Paycom', key: 'super-secret-key' };

  describe('parseBasicAuth', () => {
    it('to‘g‘ri Basic header — {login,key} qaytaradi', () => {
      expect(parseBasicAuth(basic('a', 'b'))).toEqual({ login: 'a', key: 'b' });
    });

    it('header yo‘q — null', () => {
      expect(parseBasicAuth(undefined)).toBeNull();
    });

    it('"Basic " bilan boshlanmaydi — null', () => {
      expect(parseBasicAuth('Bearer xyz')).toBeNull();
    });

    it('base64 emas — istisno tashlamaydi', () => {
      expect(() => parseBasicAuth('Basic ###not-base64###')).not.toThrow();
    });

    it('":" yo‘q (parol qismi ajratilmaydi) — null', () => {
      const noColon = Buffer.from('loginwithoutcolon', 'utf8').toString('base64');
      expect(parseBasicAuth(`Basic ${noColon}`)).toBeNull();
    });

    it('parolda ":" bo‘lsa ham faqat BIRINCHI ":" ajratadi', () => {
      expect(parseBasicAuth(basic('login', 'pa:ss:word'))).toEqual({ login: 'login', key: 'pa:ss:word' });
    });
  });

  describe('verifyPaymeBasicAuth', () => {
    it('to‘g‘ri login/key — true', () => {
      expect(verifyPaymeBasicAuth(basic(expected.login, expected.key), expected)).toBe(true);
    });

    it('xato login — false', () => {
      expect(verifyPaymeBasicAuth(basic('wrong', expected.key), expected)).toBe(false);
    });

    it('xato key — false', () => {
      expect(verifyPaymeBasicAuth(basic(expected.login, 'wrong'), expected)).toBe(false);
    });

    it('header yo‘q — false', () => {
      expect(verifyPaymeBasicAuth(undefined, expected)).toBe(false);
    });

    it('turli uzunlikdagi key — istisno tashlamasdan false qaytaradi', () => {
      expect(verifyPaymeBasicAuth(basic(expected.login, 'x'), expected)).toBe(false);
    });
  });
});
