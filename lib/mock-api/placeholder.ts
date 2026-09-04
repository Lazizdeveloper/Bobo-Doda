/* Namunaviy rasmlar — LOKAL SVG data-URI.
 *
 * Nega tashqi URL emas: CSP (`next.config.mjs` va `netlify.toml`) `img-src`ni
 * `'self' data: blob:` bilan cheklaydi. Tashqi host (unsplash va h.k.) bloklanadi
 * va bozorda har bir kartada singan rasm ko'rinadi. `data:` ruxsat etilgan —
 * shuning uchun namunaviy rasm shu yerda chiziladi, tarmoqqa chiqilmaydi.
 *
 * Uslub — "Suzani Light": oq mato ustida yashil ip bilan tikilgan naqsh.
 * To'q yoki sariq blok qo'yilmaydi (dizayn tili qoidasi).
 */

import type { ServiceCategory } from "@/lib/types";

/** Har kategoriya bitta yashil oilaning o'z tonini oladi — kartalar
    ro'yxatda bir-biridan ajralib tursin, lekin palitradan chiqmasin. */
const CATEGORY_TONE: Record<ServiceCategory, { light: string; mid: string; ink: string }> = {
  dizayn:     { light: "#F2F8F4", mid: "#BFDCC9", ink: "#15803D" },
  dasturlash: { light: "#F1F7F6", mid: "#B7D8D4", ink: "#0F766E" },
  tarjima:    { light: "#F5F8EF", mid: "#CFDFB4", ink: "#4D7C0F" },
  kontent:    { light: "#F3F8F5", mid: "#C4DCCB", ink: "#15803D" },
  marketing:  { light: "#F4F8F0", mid: "#CBDEBA", ink: "#4D7C0F" },
  video:      { light: "#F1F7F5", mid: "#BAD9D0", ink: "#0F766E" },
  audio:      { light: "#F3F7F4", mid: "#C2DAC8", ink: "#15803D" },
  biznes:     { light: "#F2F7F3", mid: "#C7DBCC", ink: "#0E5C2C" },
};

const FALLBACK_TONE = CATEGORY_TONE.dizayn;

/** Matndan barqaror (deterministik) son — bir xil sarlavha doim bir xil
    naqsh beradi, sahifa har yangilanganda rasm sakramaydi. */
function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function toDataUri(svg: string): string {
  /* encodeURIComponent — apostrof/tirnoq bo'lgan matn ham buzilmaydi.
     base64 emas: o'qish oson va hajmi ham kichik. */
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

/** Suzani "palak" — markazda doira, atrofida gulbarg qatorlari. */
function palak(cx: number, cy: number, r: number, petals: number, tone: { mid: string; ink: string }): string {
  const parts: string[] = [];
  for (let i = 0; i < petals; i += 1) {
    const angle = (i / petals) * Math.PI * 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    parts.push(
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(r * 0.34).toFixed(1)}" fill="${tone.mid}" opacity="0.75"/>`
    );
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${(r * 0.42).toFixed(1)}" fill="${tone.ink}" opacity="0.85"/>`);
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.42).toFixed(1)}" fill="none" stroke="${tone.ink}" stroke-width="2" opacity="0.35"/>`
  );
  return parts.join("");
}

/** Yugurma chok (running stitch) — dizayn tilining imzo elementi. */
function stitch(y: number, width: number, color: string, opacity: number): string {
  return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="${opacity}"/>`;
}

/**
 * Xizmat/portfolio uchun namunaviy muqova rasmi.
 * @param key   barqarorlik uchun kalit (odatda sarlavha yoki id)
 * @param category  yashil tonni tanlaydi
 */
export function svgImg(key: string, category?: ServiceCategory): string {
  const tone = (category && CATEGORY_TONE[category]) || FALLBACK_TONE;
  const h = hashOf(key);
  const W = 800;
  const H = 600;

  /* Naqsh joylashuvi kalitdan kelib chiqadi — har rasm o'ziga xos bo'lsin. */
  const petals = 6 + (h % 3) * 2; // 6, 8 yoki 10 gulbarg
  const bigR = 96 + (h % 4) * 14;
  const cx = W * 0.5 + (((h >> 3) % 5) - 2) * 26;
  const cy = H * 0.46 + (((h >> 6) % 3) - 1) * 22;

  const corners = [
    [W * 0.14, H * 0.16],
    [W * 0.86, H * 0.16],
    [W * 0.14, H * 0.84],
    [W * 0.86, H * 0.84],
  ]
    .map(([x, y], i) => palak(x, y, 34 + ((h >> (i + 1)) % 3) * 6, 6, tone))
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="${tone.light}"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.6" fill="${tone.ink}" opacity="0.13"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  ${stitch(H * 0.12, W, tone.ink, 0.28)}
  ${stitch(H * 0.88, W, tone.ink, 0.28)}
  ${corners}
  ${palak(cx, cy, bigR, petals, tone)}
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="${tone.ink}" stroke-width="2" opacity="0.18"/>
</svg>`;

  return toDataUri(svg);
}

/** Bir xizmat uchun bir nechta gallereya rasmi — har biri boshqacha naqsh. */
export function svgGallery(key: string, category: ServiceCategory, count = 2): string[] {
  return Array.from({ length: count }, (_, i) => svgImg(`${key}#${i}`, category));
}
