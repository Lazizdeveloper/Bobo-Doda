import type { MetadataRoute } from "next";

/** Landing'da qoladigan (backend'ga bog'liq bo'lmagan) ochiq sahifalar. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bobododa.uz";
  const paths = ["/", "/oferta", "/maxfiylik", "/shartlar", "/savol-javob", "/yordam-markazi"];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
