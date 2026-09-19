/**
 * Bosqich 12, bo'lim 23 — Payme summa birligi rasmiy hujjat bo'yicha
 * TIYIN (developer.help.paycom.uz/metody-merchant-api/createtransaction/:
 * `amount` — "Сумма платежа (в тийинах)"). Bu bizning ichki BigInt tiyin
 * konvensiyamiz (`common/money/money.util.ts`) bilan BIR XIL birlik —
 * shuning uchun "konvertatsiya" aslida faqat ikki chegara (JSON `number` ↔
 * bizning `BigInt`) o'rtasida XAVFSIZ o'tish, FLOAT arifmetika YO'Q.
 *
 * `MAX_SAFE_TIYIN` — `Number.MAX_SAFE_INTEGER` (9 007 199 254 740 991), bu
 * `common/money/money.util.ts#MAX_SOM` (10 mlrd so'm = 1 trln tiyin)dan
 * ancha katta — amaliy summalar hech qachon bu chegaraga yaqinlashmaydi,
 * lekin provider tomonidan yuborilgan (ishonib bo'lmaydigan) qiymat har
 * doim aniq tekshiriladi.
 */
import { PaymeRpcError } from './payme-rpc-error';
import { PAYME_ERROR } from './payme-rpc.types';

const MAX_SAFE_TIYIN = BigInt(Number.MAX_SAFE_INTEGER);

/** Payme JSON-RPC `amount` (number, tiyin) → bizning ichki BigInt tiyin. Yaroqsiz bo'lsa -31001. */
export function paymeAmountToTiyin(amount: unknown): bigint {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0 || !Number.isSafeInteger(amount)) {
    throw new PaymeRpcError(PAYME_ERROR.INVALID_AMOUNT, 'Noto‘g‘ri summa');
  }
  return BigInt(amount);
}

/** Bizning ichki BigInt tiyin → Payme JSON-RPC `amount` (number). Overflow bo'lsa xato (chaqiruvchi ichki xato sifatida ko'radi — provider’ga hech qachon chiqmasligi kerak). */
export function tiyinToPaymeAmount(tiyin: bigint): number {
  if (tiyin <= 0n || tiyin > MAX_SAFE_TIYIN) {
    throw new RangeError(`tiyinToPaymeAmount: summa xavfsiz JS number oralig'idan tashqari: ${tiyin.toString()}`);
  }
  return Number(tiyin);
}
