/**
 * OTP siyosati — YAGONA MANBA (Bosqich 2 spec). Bu sonlar `OtpService`
 * ichidagi rate-limit va urinish-cheklov mantig'ini boshqaradi.
 */

/** Kod necha soniyadan keyin tugaydi. */
export const OTP_EXPIRY_SECONDS = 5 * 60;

/** Nechta noto'g'ri urinishdan keyin kod "kuyadi" (qayta ishlatib bo'lmaydi). */
export const OTP_MAX_ATTEMPTS = 5;

/** Bitta telefon uchun qayta yuborish orasidagi eng kam vaqt. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Bitta telefon — kunlik so'rov chegarasi (SMS xarajati + suiiste'mol himoyasi). */
export const OTP_PHONE_DAILY_LIMIT = 10;
export const OTP_PHONE_DAILY_WINDOW_SECONDS = 24 * 60 * 60;

/** Bitta IP — soatlik so'rov chegarasi (ko'p telefon raqamini sinab ko'rish himoyasi). */
export const OTP_IP_HOURLY_LIMIT = 20;
export const OTP_IP_HOURLY_WINDOW_SECONDS = 60 * 60;

/** SMS shabloni nomi — `SmsLog.template` va `OtpSmsJobData.template`. */
export const OTP_SMS_TEMPLATE = 'otp_login';
