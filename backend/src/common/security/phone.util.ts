import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { DomainError } from '@/common/errors/domain-error';

/**
 * Telefon raqamini E.164'ga normallashtiradi — YAGONA manba (boshqa
 * hech qayerda qo'lda `replace(/\D/g,'')` yoki shunga o'xshash qilinmaydi).
 *
 * `+998 90 123-45-67`, `998901234567`, `901234567` — bittasi bir xil odam
 * bo'lishi kerak (default mintaqa — UZ, prefikssiz 9 xonali raqamlar ham
 * to'g'ri talqin qilinadi).
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = parsePhoneNumberWithError(trimmed, 'UZ');
    if (!parsed.isValid()) {
      throw new DomainError('INVALID_INPUT', "Telefon raqami noto'g'ri", {
        fieldErrors: { phone: "Telefon raqami noto'g'ri formatda" },
      });
    }
    return parsed.number; // E.164, masalan "+998901234567"
  } catch (err) {
    if (err instanceof DomainError) throw err;
    throw new DomainError('INVALID_INPUT', "Telefon raqami noto'g'ri", {
      fieldErrors: { phone: "Telefon raqami noto'g'ri formatda" },
      context: { cause: err instanceof Error ? err.message : String(err) },
    });
  }
}
