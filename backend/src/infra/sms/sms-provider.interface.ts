/**
 * SMS provayder abstraksiyasi (Bosqich 2 spec). Real provayderlar: PlayMobile
 * (Bosqich 13) va TextUp (Bosqich 23, production'da tanlangan) — Eskiz hali
 * ham YOZILMAGAN (rasmiy hujjat JS-render qilinadigan sahifa, statik fetch
 * o'qiy olmadi). Interfeys shu joyni tayyorlab qo'ydi — yangi provayder
 * qo'shilganda faqat SHU fayllar (`providers/<nom>/` papkasidagi provider
 * klassi + `sms.module.ts`dagi bitta `case`) o'zgaradi, `OtpService`/boshqa
 * chaqiruvchi kod TEGILMAYDI.
 *
 * Bosqich 10 — bu BITTA interfeys OTP (`OtpSmsProcessor`) VA generic
 * Outbox-notification worker ORASIDA baham ko'riladi (bo'lim 12: "bir xil
 * provider client'dan foydalanish mumkin"). Qo'shimchalar OTP chaqiruvini
 * BUZMAYDI — ikkalasi ham ixtiyoriy (orqaga moslik: `send(phone, template,
 * params)` uch argumentli chaqiruv hali ham to'g'ri ishlaydi).
 */
export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  errorMessage?: string;
  /**
   * Bo'lim 23 — retry klassifikatsiyasi. Berilmasa (`undefined`) —
   * RETRYABLE deb hisoblanadi (konservativ sukut: "aniq emasmi — qayta
   * urinib ko'r", bo'lim 23's "Generic cases conservative").
   */
  permanent?: boolean;
  /** Bo'lim 40 — provider rate-limit signali (masalan HTTP 429 Retry-After). */
  retryAfterSeconds?: number;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export interface SmsProvider {
  /**
   * `options.reference` — Bosqich 10, bo'lim 11: barqaror delivery
   * identifikatori (`OutboxEvent.id`). Provider idempotency qo'llab-
   * quvvatlasa shundan foydalanishi mumkin — HAR RETRY'DA YANGI TASODIFIY
   * reference YARATILMAYDI. OTP chaqiruvi buni bermaydi (kerak emas —
   * OTP bir martalik, retry OTP navbatining o'zi ichida, alohida
   * `OTP_SMS_QUEUE`da).
   */
  send(
    phone: string,
    template: string,
    params: Record<string, string>,
    options?: { reference?: string },
  ): Promise<SmsSendResult>;
}
