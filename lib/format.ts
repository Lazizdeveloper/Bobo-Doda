import type { Lang } from "@/lib/i18n/dictionary";

/* Barcha yozuvlar UZS'da saqlanadi. Ilgari bu yerda ko'p valyutali qatlam
   (KZT/KGS/TJS/TMT) bor edi, lekin u faqat BELGINI almashtirar, summani
   konvertatsiya qilmasdi — ya'ni bir xil raqamni "tenge" deb ko'rsatardi.
   Bu moliyaviy jihatdan noto'g'ri, shuning uchun qatlam olib tashlandi.
   Ko'p valyuta backend real kurs va asl valyutani qaytargandagina qaytadi. */
const UZS_LABEL: Record<Lang, string> = { uz: "so'm", ru: "сум", en: "soum" };

/** Faqat raqam — valyuta belgisisiz (masalan bildirishnoma matni belgini
    o'zi qo'shadi: "{amount} so'm"). Guruhlash `formatMoney` bilan BIR XIL.

    Ilgari bunday joylarda `n.toLocaleString()` chaqirilardi: argumentsiz
    variant BRAUZER lokalini oladi, ya'ni bitta summa bir foydalanuvchida
    "3 500 000", boshqasida "3,500,000" va uchinchisida "3.500.000" bo'lib
    ko'rinardi. Pul ko'rsatiladigan joyda bu qabul qilib bo'lmaydi. */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

export function formatMoney(amount: number, lang: Lang = "uz"): string {
  return `${formatAmount(amount)} ${UZS_LABEL[lang] ?? UZS_LABEL.uz}`;
}

/* O'zbek oy nomlari QO'LDA yoziladi, brauzer Intl'iga tashlab qo'yilmaydi.
   Sabab: ko'p brauzer qurilmasida `uz-UZ` CLDR ma'lumoti to'liq emas va
   `month: "short"` "M03" kabi zaxira formatga tushadi — foydalanuvchi
   "2026 M03 5" degan o'qib bo'lmaydigan sanani ko'radi. ru/en asosiy
   lokallar, ular hamma joyda bor, shuning uchun Intl'da qoldiriladi. */
const UZ_MONTHS_SHORT = [
  "yan", "fev", "mar", "apr", "may", "iyn",
  "iyl", "avg", "sen", "okt", "noy", "dek",
];

export function formatDate(iso: string, lang: Lang = "uz"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (lang === "uz") {
    return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "2026-08" kabi yil-oy kalitini qisqa oy nomiga aylantiradi (masalan "avg 26") */
export function formatMonth(yearMonth: string, lang: Lang = "uz"): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return yearMonth;
  if (lang === "uz") {
    return `${UZ_MONTHS_SHORT[month - 1]} ${String(year).slice(-2)}`;
  }
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    month: "short",
    year: "2-digit",
  });
}

/* Vaqt ham tilga qarab formatlanadi. Ilgari qat'iy "ru-RU" edi — o'zbek va
   ingliz interfeysida ham rus lokali ishlatilardi. */
export function formatTime(iso: string, lang: Lang = "uz"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
  return d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: lang === "en",
  });
}

export function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

