/**
 * Bosqich 22 — generatsiya qilingan OTP kodini javobda ko'rsatish qarori,
 * ASOSIY OTP oqimidan (`OtpService.requestOtp`) ATAYLAB ajratilgan pure
 * funksiya — DB/queue mock qilmasdan, to'g'ridan-to'g'ri unit test qilinadi.
 *
 * Uchta shart BIRGA rost bo'lishi shart — har biri mustaqil qatlam:
 *   1. `!isProduction` — production HECH QACHON (bo'lim 10/15).
 *   2. `smsProvider === 'CONSOLE'` — haqiqiy SMS umuman yuborilmayapti,
 *      demak kod allaqachon backend konsoliga chiqadi (sizib chiqish xavfi
 *      yo'q). `env.schema.ts` production+CONSOLE birikmasini BOOT vaqtida
 *      allaqachon rad etadi — bu YERDAGI tekshiruv esa RUNTIME'dagi
 *      IKKINCHI, mustaqil qatlam (boot-tekshiruvga ishonib qolmaydi, xuddi
 *      F1/ADR-03dagi kabi falsafa).
 *   3. `devExposeOtp` — operator ATAYLAB yoqqan (`DEV_EXPOSE_OTP=true`).
 *
 * Har qanday BITTASI yolg'on bo'lsa — natija `false`, kod hech qachon
 * qaytarilmaydi.
 */
export function shouldExposeDevOtp(params: {
  isProduction: boolean;
  smsProvider: 'CONSOLE' | 'PLAYMOBILE';
  devExposeOtp: boolean;
}): boolean {
  return !params.isProduction && params.smsProvider === 'CONSOLE' && params.devExposeOtp;
}
