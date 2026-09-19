import { paymeAmountToTiyin, tiyinToPaymeAmount } from './payme-amount.util';
import { PaymeRpcError } from './payme-rpc-error';

describe('payme-amount.util', () => {
  describe('paymeAmountToTiyin', () => {
    it('1 tiyin — qabul qilinadi', () => {
      expect(paymeAmountToTiyin(1)).toBe(1n);
    });

    it('kichik summa — round-trip', () => {
      expect(paymeAmountToTiyin(50_000)).toBe(50_000n);
    });

    it('katta (lekin real) summa — round-trip', () => {
      expect(paymeAmountToTiyin(1_000_000_000_00)).toBe(1_000_000_000_00n);
    });

    it('0 yoki manfiy — PaymeRpcError (-31001)', () => {
      expect(() => paymeAmountToTiyin(0)).toThrow(PaymeRpcError);
      expect(() => paymeAmountToTiyin(-500)).toThrow(PaymeRpcError);
      try {
        paymeAmountToTiyin(0);
      } catch (err) {
        expect((err as PaymeRpcError).rpcCode).toBe(-31001);
      }
    });

    it('butun son emas (decimal) — rad etiladi', () => {
      expect(() => paymeAmountToTiyin(100.5)).toThrow(PaymeRpcError);
    });

    it('number emas (string/undefined/null) — rad etiladi', () => {
      expect(() => paymeAmountToTiyin('500000')).toThrow(PaymeRpcError);
      expect(() => paymeAmountToTiyin(undefined)).toThrow(PaymeRpcError);
      expect(() => paymeAmountToTiyin(null)).toThrow(PaymeRpcError);
    });

    it('overflow (MAX_SAFE_INTEGER’dan katta) — rad etiladi', () => {
      expect(() => paymeAmountToTiyin(Number.MAX_SAFE_INTEGER + 10)).toThrow(PaymeRpcError);
    });
  });

  describe('tiyinToPaymeAmount', () => {
    it('round-trip — paymeAmountToTiyin bilan simmetrik', () => {
      const tiyin = paymeAmountToTiyin(900_000);
      expect(tiyinToPaymeAmount(tiyin)).toBe(900_000);
    });

    it('0 yoki manfiy BigInt — RangeError', () => {
      expect(() => tiyinToPaymeAmount(0n)).toThrow(RangeError);
      expect(() => tiyinToPaymeAmount(-1n)).toThrow(RangeError);
    });

    it('xavfsiz oraliqdan katta BigInt — RangeError', () => {
      expect(() => tiyinToPaymeAmount(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(RangeError);
    });
  });
});
