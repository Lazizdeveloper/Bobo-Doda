import type { MetadataRoute } from "next";
import { HELP_ARTICLES } from "@/lib/help-articles";

/**
 * Bobololadono to'liq sayt xaritasi (sitemap.xml).
 * Barcha asosiy, huquqiy va 11 ta yordam maqolalari, shuningdek /ru va /en versiyalari.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bobololadono.uz";
  const staticPaths = [
    "",
    "/oferta",
    "/maxfiylik",
    "/shartlar",
    "/savol-javob",
    "/yordam-markazi",
  ];
  const articlePaths = HELP_ARTICLES.map((a) => `/yordam-markazi/${a.slug}`);
  const allPaths = [...staticPaths, ...articlePaths];

  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  for (const path of allPaths) {
    // Asosiy (uz) URL
    entries.push({
      url: `${base}${path}`,
      lastModified: now,
    });
    // /ru versiyasi
    entries.push({
      url: `${base}/ru${path}`,
      lastModified: now,
    });
    // /en versiyasi
    entries.push({
      url: `${base}/en${path}`,
      lastModified: now,
    });
  }

  return entries;
}
