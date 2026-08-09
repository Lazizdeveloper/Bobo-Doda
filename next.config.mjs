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
  /* Build papkasi. Odatda ".next". Dev'da ikki server bir vaqtda ishlaganda
     (asosiy + admin) har biriga alohida papka beriladi (NEXT_DIST_DIR) — aks
     holda ular bitta ".next" ni buzadi. Production build env qo'ymaydi →
     doim ".next" ishlatiladi, ya'ni ishlab chiqarishga ta'sir yo'q. */
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
  async rewrites() {
    return [
      // Bosh sahifa (/) — statik landing page (public/landing.html).
      // "Boshlash / Ro'yxatdan o'tish" tugmalari /kirish ga olib boradi.
      { source: "/", destination: "/landing.html" },
    ];
  },
};

export default nextConfig;
