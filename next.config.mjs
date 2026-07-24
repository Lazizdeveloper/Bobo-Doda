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
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
