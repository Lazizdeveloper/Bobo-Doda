/**
 * Bosqich 22 — `devOtp` (backend `request-otp` javobidan, FAQAT development)
 * telefon-kiritish sahifasidan ("/royxatdan-otish", "/parolni-unutdim") OTP
 * sahifasiga o'tishda ko'rsatiladi. ATAYLAB `localStorage`/`sessionStorage`
 * EMAS — faqat JS xotirasida: sahifa yangilansa (hard refresh) butun modul
 * qayta yuklanadi va qiymat yo'qoladi (shu holatda "Kodni qayta yuborish"
 * bosilsa yangi devOtp keladi).
 *
 * `peekDevOtp()` ATAYLAB O'QISHDA TOZALAMAYDI (avvalgi "bir marta o'qish"
 * dizayni React Strict Mode bilan mos kelmadi — dev rejimida effektlar
 * IKKI MARTA chaqiriladi, ikkinchisi bo'sh qiymat oladi va DEV blokini
 * yashirib qo'yardi). Muammo emas: kod backend tomonida bir martalik/qisqa
 * TTL bilan himoyalangan — eskirgan qiymat ekranda qolsa ham ishlamaydi,
 * "Kodni qayta yuborish" yangisini `stashDevOtp()` bilan almashtiradi.
 */
let pending: string | undefined;

export function stashDevOtp(code: string | undefined): void {
  pending = code;
}

export function peekDevOtp(): string | undefined {
  return pending;
}
