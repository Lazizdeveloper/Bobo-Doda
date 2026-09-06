"use client";

import { CATEGORIES } from "@/lib/category-fields";
import type { ServiceCategory } from "@/lib/types";

const ADMIN_CATEGORIES_KEY = "sb2_admin_categories";

interface StoredCategory {
  slug: string;
  active: boolean;
}

/**
 * Admin tomonidan o'chirilgan kategoriya slug'lari.
 *
 * Admin panelidagi "faol" tugmasi ilgari hech narsaga ta'sir qilmasdi —
 * u faqat o'z ro'yxatidagi belgini almashtirardi. Endi o'chirilgan
 * kategoriyada YANGI xizmat/e'lon yaratib bo'lmaydi.
 *
 * MUHIM: mavjud xizmat va e'lonlar bozorda ko'rinishda qolaveradi —
 * kategoriyani o'chirish yaratishni to'xtatadi, allaqachon sotilayotgan
 * ishni yashirmaydi (aks holda mutaxassislar xizmatini yo'qotgandek his
 * qilardi va faol shartnomalar kontekstsiz qolardi).
 */
export function getDisabledCategories(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ADMIN_CATEGORIES_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw) as StoredCategory[];
    if (!Array.isArray(list)) return new Set();
    return new Set(list.filter((c) => c && c.active === false).map((c) => c.slug));
  } catch {
    return new Set();
  }
}

/** Yangi xizmat/e'lon yaratishda tanlash mumkin bo'lgan kategoriyalar.
    Hech biri qolmasa, to'liq ro'yxat qaytadi — admin xatosi tufayli
    foydalanuvchi umuman ish e'lon qila olmay qolmasligi kerak. */
export function getSelectableCategories(): ServiceCategory[] {
  const disabled = getDisabledCategories();
  const open = CATEGORIES.filter((c) => !disabled.has(c));
  return open.length > 0 ? open : CATEGORIES;
}
