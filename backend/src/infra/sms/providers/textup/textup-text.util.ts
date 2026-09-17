import { OTP_SMS_TEMPLATE } from '@/modules/auth/constants/otp.constants';
import { DomainError } from '@/common/errors/domain-error';
import type { TextUpConfig } from './textup.types';

/**
 * Bo'lim 11 — matn TextUp moderatsiyasiga topshirilgan matn bilan ANIQ
 * mos kelishi SHART ("BOBODODA" bitta so'z, `&` YO'Q, nuqta/qo'shimcha
 * matn YO'Q) — moderatsiya "BOBODODA Registration/Password Reset OTP"
 * shabloni aynan shu statik qismga tasdiqlangan, boshqacha matn
 * tasdiqlangan shablon bilan mos kelmasligi mumkin. Qisqa (bitta SMS
 * segmenti), parol/JWT/shaxsiy ma'lumot/havola YO'Q.
 */
export function renderTextUpText(template: string, params: Record<string, string>): string {
  if (template === OTP_SMS_TEMPLATE) {
    const code = params.code;
    if (!code) {
      throw new DomainError('INVALID_INPUT', 'OTP SMS uchun "code" parametri yo‘q');
    }
    return params.purpose === 'PASSWORD_RESET'
      ? `BOBODODA parolni tiklash kodi: ${code}`
      : `BOBODODA tasdiqlash kodi: ${code}`;
  }
  const message = params.message;
  if (!message) {
    throw new DomainError('INVALID_INPUT', `"${template}" uchun "message" parametri yo‘q`);
  }
  return message;
}

/**
 * Bo'lim 16 — TextUp `send` so'rovidagi `name` maydoni: ICHKI operatsion
 * yorliq (kampaniya/partiya nomi), SMS matnining O'ZI EMAS — shuning
 * uchun moderatsiya matnidan mustaqil ravishda o'qiladigan "BoboDoda ..."
 * shaklida qoladi.
 */
export function deriveTextUpSmsName(template: string, params: Record<string, string>): string {
  if (template === OTP_SMS_TEMPLATE) {
    return params.purpose === 'PASSWORD_RESET' ? 'BoboDoda Password Reset OTP' : 'BoboDoda Registration OTP';
  }
  return template;
}

/**
 * Bo'lim 10 — IKKITA alohida shablon ID (bitta umumiy EMAS): moderatsiya
 * ro'yxatdan o'tgan har bir SMS matni uchun ALOHIDA tasdiqlanadi.
 * Moderatsiya hali "Tekshirilmoqda" bo'lgani uchun ikkalasi ham
 * `undefined` bo'lishi mumkin — shunda `templateId` so'rovdan BUTUNLAY
 * chiqarib tashlanadi (xom `message` bilan yuboriladi, bo'lim 14).
 */
export function deriveTextUpTemplateId(
  template: string,
  params: Record<string, string>,
  config: Pick<TextUpConfig, 'registrationTemplateId' | 'passwordResetTemplateId'>,
): string | undefined {
  if (template !== OTP_SMS_TEMPLATE) return undefined;
  return params.purpose === 'PASSWORD_RESET' ? config.passwordResetTemplateId : config.registrationTemplateId;
}
