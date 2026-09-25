/**
 * Marketplace auth siyosati — YAGONA MANBA (Bosqich 2, Bosqich 21 — parol
 * bilan login). Bu sonlar `OtpService`/`AuthService`/`AuthGrantService`
 * ichidagi rate-limit, urinish-cheklov va parol siyosati mantig'ini
 * boshqaradi.
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

/** SMS shabloni nomi — `SmsLog.template` va `OtpSmsJobData.template`.
    Bosqich 21 — REGISTER va PASSWORD_RESET ikkalasi ham shu bitta shablonni
    ishlatadi (matn ikkalasi uchun ham to'g'ri: "tasdiqlash kodi: X"),
    purpose-specific farq FAQAT frontend UI matnida (`lib/i18n`). */
export const OTP_SMS_TEMPLATE = 'otp_verification';

/**
 * Bosqich 21 — OTP tasdiqlangandan keyin, yakuniy amal (User yaratish /
 * parol almashtirish) bajarilgunga qadar `AuthGrant` yashaydigan muddat.
 */
export const AUTH_GRANT_TTL_SECONDS = 10 * 60;

/**
 * Bosqich 21, bo'lim 43 — parol siyosati. Staff'dan farqli (10 ta), oddiy
 * foydalanuvchi uchun composition-fetish qoidalarsiz, murakkab bo'lmagan
 * chegara — uzunlik yetarli.
 */
export const USER_PASSWORD_MIN_LENGTH = 8;
/** Argon2 DoS himoyasi — cheksiz uzun kirish hash CPU vaqtini chizada oshiradi. */
export const USER_PASSWORD_MAX_LENGTH = 128;

/** Bo'lim 12 — parol bilan login, bitta telefon uchun oynadagi eng ko'p urinish
    (staff'ning email-brute-force himoyasi bilan bir xil naqsh). */
export const LOGIN_PHONE_MAX_ATTEMPTS = 10;
export const LOGIN_PHONE_WINDOW_SECONDS = 15 * 60;

/** Bo'lim 12 — bitta IP uchun (ko'p telefon sinash himoyasi). */
export const LOGIN_IP_MAX_ATTEMPTS = 30;
export const LOGIN_IP_WINDOW_SECONDS = 15 * 60;

/**
 * OTP verify security hardening — `verify-otp` (REGISTER va PASSWORD_RESET)
 * uchun IP bo'yicha chegara. `OTP_MAX_ATTEMPTS` (yuqorida) endi ATOMIK
 * bo'lgani uchun bitta kodni "taxmin qilish" allaqachon 5taga qattiq
 * cheklangan — bu IP chegara shunga QO'SHIMCHA, ko'p turli kod/telefonga
 * qarshi hajmli/CPU-xarajat suiiste'molini (har bir urinish argon2id
 * hisoblaydi) cheklaydi. ATAYLAB telefon bo'yicha EMAS, faqat IP bo'yicha:
 * telefon bo'yicha bo'lganda tajovuzkor qurbonning raqamini bilib, unga
 * atayin ko'p noto'g'ri so'rov yuborib, uning haqiqiy ro'yxatdan o'tish/
 * parol tiklash oqimini bloklab qo'yishi mumkin edi.
 *
 * Qiymat O'YLAB TOPILMAGAN — mavjud so'rash-tomoni chegaradan HOSILA:
 * `OTP_IP_HOURLY_LIMIT` (bitta IP soatiga eng ko'p nechta YANGI kod
 * so'rashi mumkin) × `OTP_MAX_ATTEMPTS` (har bir kodga eng ko'p nechta
 * urinish) — bu ANIQ shu IP so'rash chegarasi ostida, haqiqiy (baxtsiz,
 * lekin zararli EMAS — masalan bitta ofis IP'sidan bir nechta foydalanuvchi)
 * foydalanishda yuzaga kelishi mumkin bo'lgan YUQORI chegara. Undan yuqori
 * hajm allaqachon boshqa hodisa (suiiste'mol yoki xato)ni bildiradi. Oyna
 * ham so'rash-tomoni bilan BIR XIL (`OTP_IP_HOURLY_WINDOW_SECONDS`) —
 * ikkala chegara bir xil vaqt oynasida mantiqan bog'liq.
 */
export const OTP_VERIFY_IP_MAX_ATTEMPTS = OTP_IP_HOURLY_LIMIT * OTP_MAX_ATTEMPTS;
export const OTP_VERIFY_IP_WINDOW_SECONDS = OTP_IP_HOURLY_WINDOW_SECONDS;
