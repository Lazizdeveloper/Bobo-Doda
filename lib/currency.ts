import type { Lang } from "@/lib/i18n/dictionary";

/* Markaziy Osiyo valyutalari. Global o'zgartkich (til yonida) tanlaydi.
   MOCK: konvertatsiya YO'Q — summa raqami o'zgarmaydi, faqat belgi almashadi.
   Belgi tilga qarab lokallashadi (so'm / сум / soum). */
export type Currency = "UZS" | "KZT" | "KGS" | "TJS" | "TMT";

export const CURRENCIES: Record<
  Currency,
  { uz: string; ru: string; en: string; country: string }
> = {
  UZS: { uz: "so'm", ru: "сум", en: "soum", country: "🇺🇿" },
  KZT: { uz: "tenge", ru: "тенге", en: "tenge", country: "🇰🇿" },
  KGS: { uz: "som", ru: "сом", en: "som", country: "🇰🇬" },
  TJS: { uz: "somoni", ru: "сомони", en: "somoni", country: "🇹🇯" },
  TMT: { uz: "manat", ru: "манат", en: "manat", country: "🇹🇲" },
};

export const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[];

/* Modul-darajali holat: formatMoney(amount, lang) imzosini o'zgartirmaslik uchun
   joriy valyuta shu yerdan o'qiladi. LanguageProvider localStorage'dan yozadi.
   Qayta render — useT() konteksti orqali (valyuta o'zgarsa kontekst yangilanadi). */
let current: Currency = "UZS";

export function getCurrency(): Currency {
  return current;
}

export function setCurrencyStore(c: Currency): void {
  current = c;
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && v in CURRENCIES;
}

/** Valyuta belgisi — tanlangan tilda (so'm / сум / soum) */
export function currencyLabel(c: Currency, lang: Lang): string {
  return CURRENCIES[c][lang] ?? CURRENCIES[c].uz;
}
