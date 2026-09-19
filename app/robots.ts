import type { MetadataRoute } from "next";

/**
 * Domen bo'linishi (2026-09) — bitta kod, ikki rol. Vercel'da (landing,
 * `process.env.VERCEL === "1"`) ochiq sahifalar qidiruvga ruxsat etiladi.
 * Railway'da (haqiqiy, autentifikatsiyalangan ilova — app.bobododa.uz)
 * indekslashning hech qanday ma'nosi yo'q (kabinet sahifalari login talab
 * qiladi), shuning uchun butunlay yopiladi.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL !== "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://bobododa.uz/sitemap.xml",
  };
}
