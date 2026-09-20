/** @type {import('next').NextConfig} */

/* Xavfsizlik header'lari va CSP — YAGONA MANBA `csp.config.mjs` da.
   `netlify.toml` dagi nusxa `scripts/check-csp.cjs` bilan tekshiriladi
   (`npm run verify` ichida), shuning uchun ikkalasi ajralib keta olmaydi. */
import { securityHeaders } from "./csp.config.mjs";
import { assertApiUrlSane } from "./api-url.config.mjs";

/* Bo'lim 25 (real production insident) — `NEXT_PUBLIC_API_URL` sog'ligini
   tekshiradi (`api-url.config.mjs`, YAGONA MANBA — `scripts/check-api-url.cjs`
   `npm run verify`da bir xil funksiyani chaqiradi). Qiymat noto'g'ri
   ko'rinsa (localhost/http production'da, yoki global API prefiksi "/api/v1"
   yo'q) — build'ni to'xtatadi; berilmagan bo'lsa (Vercel landing/CI/lokal
   dev) jim o'tadi — FAQAT Railway asosiy ilova ("frontend" xizmati) uchun
   bo'sh qiymat ham xato: u backend'ga ulanishi SHART.

   `RAILWAY_ENVIRONMENT_NAME`/`RAILWAY_PROJECT_ID` — Railway platformasi
   o'zi HAR BIR build/runtime'ga avtomatik beradi (`VERCEL` bilan bir xil
   naqsh, yuqoridagi izohga qarang) — qo'lda sozlash SHART EMAS. `NETLIFY`
   — Netlify build muhitiga o'zi beradigan o'zgaruvchi (`netlify.toml`
   hamon mavjud va `npm run verify`dagi `check:csp` bilan faol tekshiriladi
   — bu build maqsadi TASHLAB KETILMAGAN). Security-engineer topilmasi:
   ILGARI faqat Railway/Vercel tekshirilardi — Netlify'da build qilinsa
   `isRealDeploy` NOTO'G'RI `false` qolib, localhost/http qiymatlar
   Netlify uchun ham (noto'g'ri) o'tkazib yuborilardi.

   Lokal `next build`/`next dev`da (shu jumladan CI'dagi `npm run verify`
   va Playwright uchun mahalliy backend'ga ulangan build/start) bu
   o'zgaruvchilarning HECH biri YO'Q, shuning uchun `isRealDeploy=false`
   qoladi va localhost/http qiymatlar rad etilmaydi (aks holda
   `.env.local`dagi `http://localhost:4000/api/v1` bilan `npm run dev`
   ISHLAMAY QOLADI — bu ANIQLANGAN va shu tuzatish bilan yopilgan
   regressiya). */
const isRailwayBuild = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);
const isVercelBuild = process.env.VERCEL === "1";
const isNetlifyBuild = process.env.NETLIFY === "true";
assertApiUrlSane(process.env.NEXT_PUBLIC_API_URL, {
  requireForApp: isRailwayBuild,
  isRealDeploy: isRailwayBuild || isVercelBuild || isNetlifyBuild,
});

const nextConfig = {
  /* Build papkasi. Odatda ".next". NEXT_DIST_DIR faqat ishlab turgan dev
     serverga tegmasdan alohida build qilish kerak bo'lganda ishlatiladi
     (masalan `NEXT_DIST_DIR=.next-check npm run build`) — aks holda build
     dev serverning ".next" papkasini ustiga yozib, uni buzadi. */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* Monorepo (npm workspaces). `@bobododa/contracts` — OpenAPI'dan
     generatsiya qilingan TS manbasini (`.ts`, kompilyatsiyalanmagan)
     eksport qiladi; Next uni o'zi transpil qilishi kerak. Bosqich 2 dan
     `lib/api/wire-enums.ts` shu paketdan import qiladi. */
  transpilePackages: ["@bobododa/contracts"],
  /* FAQAT DEV. Next 16 dev serveri `/_next/*` (HMR, chunk'lar) ga
     "cross-origin" so'rovlarni bloklaydi — va u `localhost` bilan
     `127.0.0.1` ni HAR XIL origin deb biladi. Natijada `127.0.0.1:3000`
     orqali ochilgan sahifa SERVER TOMONIDA to'g'ri render bo'ladi, lekin
     JS chunk'lari bloklanib HYDRATE BO'LMAYDI: forma tugmalari ishlamaydi,
     `onSubmit` o'rniga brauzer formani oddiy GET bilan yuboradi va
     ro'yxatdan o'tish jimgina uzilib qoladi. Xato konsolda emas, faqat
     server logida ("Blocked cross-origin request") ko'rinadi, shuning
     uchun uni topish juda qiyin. E2E skriptlari ham aynan shu manzilga
     uriladi. Ishlab chiqarish build'iga (`next start`) taalluqli emas. */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /* Domen bo'linishi (2026-09) — bobododa.uz FAQAT landing+huquqiy
     sahifalarni ko'rsatadi, asosiy ilova app.bobododa.uz'da (Railway,
     shu bitta kodning ALOHIDA deploy'i, real backend'ga ulangan).
     `process.env.VERCEL === "1"` — Vercel PLATFORMASI o'zi HAR BIR build'ga
     avtomatik beradi (qo'lda sozlash shart emas, unutib qo'yish xavfi yo'q);
     Railway'da bu o'zgaruvchi YO'Q, shuning uchun bu redirect'lar FAQAT
     Vercel'dagi (landing) deploy'da ishlaydi — Railway'dagi (asosiy ilova)
     xuddi shu sahifalarni ODATDAGIDEK to'g'ridan-to'g'ri ko'rsatadi.
     Ro'yxat — ilovaning haqiqiy marshrutlaridan (`app/` papkasi):
     (auth) guruhi + mutaxassis/xaridor/admin/rahbariyat kabinetlari +
     to'lov natija sahifasi. Landing'da QOLADIGAN sahifalar (huquqiy +
     FAQ/yordam markazi — real backend'ga bog'liq emas) bu ro'yxatda YO'Q. */
  async redirects() {
    if (process.env.VERCEL !== "1") return [];
    const APP_ORIGIN = "https://app.bobododa.uz";
    const appOnlyPaths = [
      "/kirish",
      "/royxatdan-otish",
      "/parolni-unutdim",
      "/rol-tanlash",
      "/mutaxassis",
      "/xaridor",
      "/admin",
      "/rahbariyat",
      "/tolov",
    ];
    const appRedirects = appOnlyPaths.flatMap((path) => [
      { source: path, destination: `${APP_ORIGIN}${path}`, permanent: true },
      { source: `${path}/:rest*`, destination: `${APP_ORIGIN}${path}/:rest*`, permanent: true },
    ]);
    return [
      /* www → apex — kanonik domen bobododa.uz (huquqiy qism, section 10). */
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.bobododa.uz" }],
        destination: "https://bobododa.uz/:path*",
        permanent: true,
      },
      ...appRedirects,
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders() },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; connect-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
