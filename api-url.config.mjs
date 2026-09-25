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
 * `isRealDeploy` — HAQIQIY deploy platformasi (Railway asosiy ilova yoki
 * Vercel landing) aniqlangandami. Ikkalasi ham `next.config.mjs`da
 * platformaning o'z avtomatik o'zgaruvchisidan (`VERCEL`, `RAILWAY_*`)
 * hisoblanadi — qo'lda sozlash SHART EMAS. FAQAT shu holatda localhost/
 * http(s) qat'iy qoidalar ishlaydi: lokal dev (`npm run dev`, `.env.local`
 * — real backend `http://localhost:4000/api/v1`da) va CI/Playwright kabi
 * "next build/start real platformaga emas, mahalliy backend'ga" holatlar
 * bundan ATAYLAB mustasno — aks holda ular ham noto'g'ri rad etilardi
 * (bu funksiya ilgari HAR QANDAY localhost qiymatini muhitdan qat'i nazar
 * rad etardi — `npm run dev` `.env.local` bilan sinovdan o'tkazilganda bu
 * ANIQLANGAN: dev server "Ready" bo'lgach next.config.mjs yuklanmay
 * yiqilardi).
 *
 * `requireForApp` — Railway "frontend" xizmati (asosiy ilova, backend'ga
 * ulanishi SHART) uchun: qiymat BUTUNLAY BERILMAGAN bo'lsa ham xato
 * tashlaydi. Bo'sh qoldirish — xuddi noto'g'ri qiymat kabi — 2026-09-20
 * insidentining boshqa varianti: `API_BASE=""` bo'lsa so'rov
 * `app.bobododa.uz`ning O'ZIGA, prefiksSIZ ketadi va xuddi shunday 404
 * beradi. Vercel landing/CI/lokal dev uchun esa qiymat ATAYLAB bo'sh
 * qoldirilishi kerak — ular uchun `requireForApp=false`.
 */
export function assertApiUrlSane(url, options = {}) {
  const { requireForApp = false, isRealDeploy = false } = options;

  if (!url) {
    if (requireForApp) {
      throw new Error(
        'NEXT_PUBLIC_API_URL berilishi SHART (Railway "frontend" xizmati uchun) — bo\'sh qoldirish ' +
          '2026-09-20 insidentining "sozlanmagan" varianti: API_BASE="" bo\'lganda so\'rovlar ' +
          'app.bobododa.uz\'ning o\'ziga, "/api/v1" prefiksisiz ketadi va 404 bilan yiqiladi. ' +
          'Masalan: "https://api.bobododa.uz/api/v1".',
      );
    }
    return; // Landing (Vercel) / CI / lokal dev — ataylab bo'sh.
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`NEXT_PUBLIC_API_URL yaroqli URL emas (parse xatosi): "${url}".`);
  }

  const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

  if (isRealDeploy) {
    if (isLocalHost) {
      throw new Error(
        `NEXT_PUBLIC_API_URL production build'da localhost/127.0.0.1'ga ishora qilyapti: "${url}". Real deploy uchun bu noto'g'ri.`,
      );
    }
    if (parsed.protocol !== 'https:') {
      throw new Error(
        `NEXT_PUBLIC_API_URL production deploy'da "https://" bilan boshlanishi SHART: "${url}".`,
      );
    }
  }

  // Security-engineer topilmasi — bo'lim 25: ILGARI bu tekshiruv XOM `url`
  // satrini regex qilardi, shuning uchun `?next=/api/v1` yoki `#/api/v1`
  // kabi qiymatlar guard'ni "aldab" o'tkazib yuborardi (haqiqiy so'rov
  // yo'li — `parsed.pathname` — baribir prefikssiz qolardi, aynan 2026-09-20
  // insidentini takrorlagan holda, guard esa "sog'lom" deb hisoblardi). Endi
  // FAQAT `pathname` tekshiriladi.
  if (!/\/api\/v1\/?$/.test(parsed.pathname)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL global API prefiksi ("/api/v1") bilan tugashi SHART (backend/src/main.ts: setGlobalPrefix). ` +
        `Qiymat: "${url}". Masalan: "https://api.bobododa.uz/api/v1". ` +
        `Buni tekshirmasdan qoldirish 2026-09-20'dagi haqiqiy production insidentga sabab bo'lgan — ` +
        `HAR bir haqiqiy API so'rov (ro'yxatdan o'tish, login, staff kirish) 404 bilan yiqilgan edi.`,
    );
  }
}
