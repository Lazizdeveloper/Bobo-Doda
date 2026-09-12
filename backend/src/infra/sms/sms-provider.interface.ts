/**
 * SMS provayder abstraksiyasi (Bosqich 2 spec). Real provayderlar (Eskiz,
 * PlayMobile) — HALI YOZILMAGAN (haqiqiy API kalitlari yo'q; soxta HTTP
 * chaqiruv yozish "ishlaydi" degan noto'g'ri taassurot berardi). Interfeys
 * shu joyni tayyorlab qo'yadi — real provayder qo'shilganda faqat SHU
 * fayllar (`*.provider.ts` + `sms.module.ts`dagi bitta qator) o'zgaradi,
 * `OtpService`/boshqa chaqiruvchi kod TEGILMAYDI.
 */
export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  errorMessage?: string;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export interface SmsProvider {
  send(phone: string, template: string, params: Record<string, string>): Promise<SmsSendResult>;
}
