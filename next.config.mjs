/** @type {import('next').NextConfig} */

/* Xavfsizlik header'lari va CSP — YAGONA MANBA `csp.config.mjs` da.
   `netlify.toml` dagi nusxa `scripts/check-csp.cjs` bilan tekshiriladi
   (`npm run verify` ichida), shuning uchun ikkalasi ajralib keta olmaydi. */
import { securityHeaders } from "./csp.config.mjs";

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
