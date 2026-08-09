/* Xavfsizlik: kirish ma'lumotlari validatsiyasi (mock-api himoyasi).
   Barcha yozuvchi funksiyalar shu yerdan o'tadi — Infinity/NaN/manfiy son,
   cheksiz uzun matn va noto'g'ri havolalar bazaga tushmasin. */

/** Pul summasi uchun yuqori chegara (10 mlrd so'm — real loyihalar ostida) */
export const MAX_AMOUNT = 10_000_000_000;

/** Matn maydonlari uchun uzunlik chegaralari (belgi) */
export const LIMITS = {
  name: 100,
  phone: 20,
  password: 100,
  title: 200,
  headline: 160,
  bio: 1000,
  description: 5000,
  message: 5000,
  coverLetter: 5000,
  answer: 2000,
  comment: 2000,
  skill: 50,
  location: 100,
  question: 300,
  langName: 50,
  fieldValue: 500,
} as const;

/** Chekli, musbat, chegaralangan butun songa keltiradi; aks holda xato */
export function amount(value: unknown, { min = 1, max = MAX_AMOUNT } = {}): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error("INVALID_AMOUNT");
  }
  return Math.round(n);
}

/** Matnni trim qiladi va uzunlik chegarasidan oshsa qisqartiradi (DoS himoyasi) */
export function text(value: unknown, max: number): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.trim().slice(0, max);
}

/** Matn massivi — har bir element trim + qisqartiriladi, bo'shlari olib tashlanadi */
export function textList(
  value: unknown,
  maxItems: number,
  maxLen: number
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((v) => text(v, maxLen))
    .filter(Boolean);
}

/** Faqat ilova ichidagi ("/..." bilan boshlanadigan) havolaga ruxsat.
   Tashqi URL, protokol-nisbiy ("//evil") va "javascript:" bloklanadi. */
export function safeHref(href: unknown): string {
  const s = typeof href === "string" ? href : "";
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  return "/";
}

/* -------- Bank kartasi (Markaziy Osiyo + xalqaro) --------
   Mahalliy: Uzcard (8600), Humo (9860). Xalqaro: Visa (4), Mastercard (51–55/2221–2720).
   To'liq raqam SAQLANMAYDI — faqat tur + oxirgi 4 raqam. */
export type DetectedCardType = "visa" | "mastercard" | "uzcard" | "humo";

/** Karta turini raqam prefiksidan aniqlaydi (16 raqam kutiladi). */
export function detectCardType(digits: string): DetectedCardType | null {
  if (digits.startsWith("8600")) return "uzcard";
  if (digits.startsWith("9860")) return "humo";
  if (digits.startsWith("4")) return "visa";
  const p2 = Number(digits.slice(0, 2));
  const p4 = Number(digits.slice(0, 4));
  if ((p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)) return "mastercard";
  return null;
}

/** Karta raqamini tekshiradi: 16 raqam + tanilgan tur. Tur va oxirgi 4 raqam. */
export function cardNumber(raw: unknown): {
  type: DetectedCardType;
  last4: string;
} {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 16) throw new Error("INVALID_CARD");
  const type = detectCardType(digits);
  if (!type) throw new Error("INVALID_CARD");
  return { type, last4: digits.slice(-4) };
}

/** Amal qilish muddati "MM/YY" — oy 01–12, o'tmagan bo'lishi shart */
export function cardExpiry(raw: unknown): string {
  const s = String(raw ?? "").trim();
  const m = /^(\d{2})\/(\d{2})$/.exec(s);
  if (!m) throw new Error("INVALID_EXPIRY");
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) throw new Error("INVALID_EXPIRY");
  /* Muddat oxiri — o'sha oyning oxirgi kuni */
  const end = new Date(year, month, 0, 23, 59, 59);
  if (end.getTime() < Date.now()) throw new Error("INVALID_EXPIRY");
  return s;
}
