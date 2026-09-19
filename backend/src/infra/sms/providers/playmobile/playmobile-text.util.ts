import { OTP_SMS_TEMPLATE } from '@/modules/auth/constants/otp.constants';
import { DomainError } from '@/common/errors/domain-error';

/**
 * Bo'lim 3/5 — `SmsProvider.send()`ning ikkita ATAYLAB-turli chaqiruvchisi
 * bor: OTP (`template=OTP_SMS_TEMPLATE`, `params={code}` — provider matnni
 * O'ZI quradi) va Outbox (`template=eventType`, `params={message}` — matn
 * ALLAQACHON to'liq tayyor, `RecipientResolverService` tomonidan). Bu
 * funksiya ikkalasini BITTA aniq matn qatoriga aylantiradi — PlayMobile
 * o'zining "template-id" tizimi (portalda ro'yxatdan o'tish talab qiladi)
 * ISHLATILMAYDI, doim xom `content.text` (bo'lim 3.2 — "shablonsiz" oqim).
 */
export function renderPlayMobileText(template: string, params: Record<string, string>): string {
  if (template === OTP_SMS_TEMPLATE) {
    const code = params.code;
    if (!code) {
      throw new DomainError('INVALID_INPUT', 'OTP SMS uchun "code" parametri yo‘q');
    }
    return `Bobo&Doda tasdiqlash kodi: ${code}. Hech kimga aytmang.`;
  }
  const message = params.message;
  if (!message) {
    throw new DomainError('INVALID_INPUT', `"${template}" uchun "message" parametri yo‘q`);
  }
  return message;
}
