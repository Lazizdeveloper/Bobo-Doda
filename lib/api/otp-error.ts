import { ApiError } from "./errors";

/**
 * Bosqich 22 — OTP tasdiqlash xatosini aniq foydalanuvchi matniga
 * xaritalaydi, `ApiError.message` (xom backend kodi, masalan "INVALID_CODE")
 * bo'yicha — matn/heuristika EMAS. Format xatosi (kiritilgan qiymat
 * `/^\d{6}$/`ga mos kelmasa) bilan HECH QACHON aralashmaydi: bu funksiya
 * faqat backend haqiqatan chaqirilgandan KEYIN ishlaydi.
 *
 * Ikkala OTP sahifasida (`/royxatdan-otish/tasdiqlash`,
 * `/parolni-unutdim/tasdiqlash`) BIR XIL — ikkalasi bir xil
 * `VerifyOtpDto`/`OtpService.verifyOtp` orqali ishlaydi.
 */
export function mapOtpVerifyError(err: unknown, t: (key: string) => string): string {
  const code = err instanceof ApiError ? err.message : "";
  switch (code) {
    case "RATE_LIMITED":
      return t("auth.errRateLimited");
    case "OTP_EXPIRED":
      return t("auth.codeExpired");
    case "OTP_ATTEMPTS_EXCEEDED":
      return t("auth.codeAttemptsExceeded");
    case "INVALID_CODE":
      return t("auth.codeInvalid");
    default:
      return t("common.error");
  }
}
