import type { MetadataRoute } from "next";

/**
 * Bobololadono qidiruv tizimlari (Google, Yandex va h.k.) uchun robots.txt.
 * Ochiq sahifalar indekslanadi, sitemap havolasi beriladi.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/rahbariyat/", "/api/"],
    },
    sitemap: "https://bobololadono.uz/sitemap.xml",
  };
}
