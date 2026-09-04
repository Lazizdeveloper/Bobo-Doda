/** @type {import('next').NextConfig} */

/* Content-Security-Policy: XSS/injection'ni cheklaydi.
   - default 'self': faqat o'z domenimizdan resurs
   - style: inline (Tailwind) + Google Fonts CSS
   - font: Google Fonts (gstatic) + self
   - img: 'self' + data: (base64 rasm/portfolio) + blob:
   - frame-ancestors 'none': clickjacking himoyasi
   - object-src 'none', base-uri 'self'
   Eslatma: Next.js hidratsiya uchun script'da 'unsafe-inline' talab qiladi. */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  /* Build papkasi. Odatda ".next". NEXT_DIST_DIR faqat ishlab turgan dev
     serverga tegmasdan alohida build qilish kerak bo'lganda ishlatiladi
     (masalan `NEXT_DIST_DIR=.next-check npm run build`) — aks holda build
     dev serverning ".next" papkasini ustiga yozib, uni buzadi. */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; connect-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
