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
