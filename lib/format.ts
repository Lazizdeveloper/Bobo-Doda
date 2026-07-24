import type { Lang } from "@/lib/i18n/dictionary";
import { currencyLabel, getCurrency } from "@/lib/currency";

/* Summa — joriy valyuta belgisi bilan (belgi tilga qarab lokallashadi).
   Valyuta modul-darajali store'dan o'qiladi; imzoga currency qo'shilmagan,
   shuning uchun barcha chaqiruv joyi o'zgarmaydi. Qayta render useT() orqali. */
export function formatMoney(amount: number, lang: Lang = "uz"): string {
  const formatted = new Intl.NumberFormat("ru-RU").format(amount);
  return `${formatted} ${currencyLabel(getCurrency(), lang)}`;
}

export function formatDate(iso: string, lang: Lang = "uz"): string {
  const d = new Date(iso);
  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
