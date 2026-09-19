import { DomainError } from '@/common/errors/domain-error';

/**
 * Pul chegarasi — ADR-01: **DB/domen `BigInt` tiyin, DTO butun so'm.**
 * Ledger (kelajakdagi to'lov bosqichi) bilan BIR XIL konvensiya —
 * `Service.price`, `Contract.agreedAmount`/`Milestone.amount` ham shu
 * qoidaga bo'ysunadi, keyingi bosqichlarda qayta ixtiro qilinmasin deb
 * shu YAGONA joyga chiqarilgan.
 *
 * `Number` ishlatiladi (`BigInt` emas) DTO/JSON chegarasida — so'm
 * miqdorlari `Number.MAX_SAFE_INTEGER`dan (9 x 10^15) necha barobar kichik
 * (`MAX_SOM` pastda), shuning uchun aniqlik yo'qolmaydi.
 */

/** 10 mlrd so'm — `lib/validate.ts#MAX_AMOUNT` bilan BIR XIL chegara (frontend konvensiyasi). */
export const MAX_SOM = 10_000_000_000;

/** Butun, musbat so'm miqdorini DB tiyiniga (`BigInt`) aylantiradi. */
export function somToTiyin(som: number): bigint {
  if (!Number.isInteger(som) || som <= 0 || som > MAX_SOM) {
    throw new DomainError('INVALID_AMOUNT', "Summa noto'g'ri");
  }
  return BigInt(som) * 100n;
}

/** DB tiyinini (`BigInt`) DTO uchun butun so'mga aylantiradi. */
export function tiyinToSom(tiyin: bigint): number {
  return Number(tiyin / 100n);
}
