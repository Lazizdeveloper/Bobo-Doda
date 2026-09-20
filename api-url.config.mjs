/**
 * `NEXT_PUBLIC_API_URL` sog'ligini tekshiradi — YAGONA MANBA.
 *
 * `next.config.mjs` build vaqtida (har bir build'da) va
 * `scripts/check-api-url.cjs` orqali `npm run verify`da chaqiriladi.
 *
 * Bo'lim 25 — real production insident: bu qiymat `lib/api/http.ts`/
 * `staff-http.ts`ga TEKSHIRUVSIZ `${API_BASE}${path}` sifatida
 * yopishtiriladi. Domen cutover paytida backend'ning global prefiksi
 * (`api/v1`, `backend/src/main.ts`) SIZ o'rnatilgan edi — natijada HAR
 * bir haqiqiy so'rov (ro'yxatdan o'tish, login, staff kirish) 404 bilan
 * yiqilardi, sahifa QOBIG'I esa 200 bilan yuklanardi.
 *
 * Qiymat BERILMAGAN bo'lsa jim o'tkaziladi (CI'ning `npm run build`,
 * lokal dev, Vercel landing — bularning HECH biri buni sozlamaydi,
 * ATAYLAB). BERILGAN bo'lsa-yu noto'g'ri ko'rinsa (localhost, yoki
 * `/api/v1` yo'q) — xato tashlaydi.
 */
export function assertApiUrlSane(url) {
  if (!url) return; // Landing (Vercel) / CI / lokal dev — ataylab bo'sh.
  if (/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL production build'da localhost/127.0.0.1'ga ishora qilyapti: "${url}". Real deploy uchun bu noto'g'ri.`,
    );
  }
  if (!/\/api\/v1\/?$/.test(url)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL global API prefiksi ("/api/v1") bilan tugashi SHART (backend/src/main.ts: setGlobalPrefix). ` +
        `Qiymat: "${url}". Masalan: "https://api.bobododa.uz/api/v1". ` +
        `Buni tekshirmasdan qoldirish 2026-09-20'dagi haqiqiy production insidentga sabab bo'lgan — ` +
        `HAR bir haqiqiy API so'rov (ro'yxatdan o'tish, login, staff kirish) 404 bilan yiqilgan edi.`,
    );
  }
}
