/**
 * Bobo-Doda Anti-Circumvention Chat Filter
 * 
 * Ushbu modul platformadan tashqarida (Telegram, telefon, email, karta)
 * kelishish va firibgarlik xavfini oldini olish uchun xabarlarni tekshiradi.
 * Shartnoma tuzilib, to'lov Escrow kafolatida muzlatilmaguncha
 * shaxsiy kontaktlarni almashish cheklanadi (Upwork/Fiverr standartlari).
 */

import type { TrustReport } from "@/lib/admin-types";

export interface CircumventionCheckResult {
  hasViolation: boolean;
  type?: "phone" | "telegram" | "email" | "card" | "phrase";
  matchedText?: string;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
}

export function checkCircumvention(text: string): CircumventionCheckResult {
  if (!text || typeof text !== "string") {
    return {
      hasViolation: false,
      titleUz: "",
      titleRu: "",
      descriptionUz: "",
      descriptionRu: "",
    };
  }

  const clean = text.trim();

  // 1. Email tekshiruvi
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = clean.match(emailRegex);
  if (emailMatch) {
    return {
      hasViolation: true,
      type: "email",
      matchedText: emailMatch[1],
      titleUz: "Elektron pochta almashish cheklangan",
      titleRu: "Обмен электронной почтой ограничен",
      descriptionUz:
        "Shartnoma to'lovi Escrow kafolat hisobiga muzlatilguniga qadar elektron pochta orqali tashqi aloqa o'rnatish taqiqlanadi. Mablag'ingiz xavfsizligi uchun barcha suhbat Bobo-Doda ichida olib borilishi kerak.",
      descriptionRu:
        "До момента заморозки средств на безопасном Escrow-счете обмен email-адресами запрещен для вашей безопасности.",
    };
  }

  // 2. Telegram havolalari va username (@username, t.me/..., telegram.me/...)
  const tgLinkRegex = /((?:t\.me|telegram\.me)\/[a-zA-Z0-9_]{3,})/i;
  const tgLinkMatch = clean.match(tgLinkRegex);
  if (tgLinkMatch) {
    return {
      hasViolation: true,
      type: "telegram",
      matchedText: tgLinkMatch[1],
      titleUz: "Telegram havolasini yuborish cheklangan",
      titleRu: "Отправка ссылок Telegram ограничена",
      descriptionUz:
        "Shartnoma rasmiylashtirilmasdan Telegram orqali suhbatlashish xavfli bo'lib, firibgarlikdan himoyasiz qoldiradi. Iltimos, suhbatni platformada davom ettiring.",
      descriptionRu:
        "Переход в Telegram до оформления безопасного контракта несет риск мошенничества и лишает защиты Escrow.",
    };
  }

  // Telegram @username (kamida 4 ta belgi)
  const tgUsernameRegex = /(^|\s)(@[a-zA-Z0-9_]{4,32})\b/;
  const tgUserMatch = clean.match(tgUsernameRegex);
  if (tgUserMatch) {
    return {
      hasViolation: true,
      type: "telegram",
      matchedText: tgUserMatch[2],
      titleUz: "Telegram manzilini almashish cheklangan",
      titleRu: "Обмен контактами Telegram ограничен",
      descriptionUz:
        "To'lov kafolatlanmasdan oldin Telegram kontaktlarini almashish qoidabuzarlik hisoblanadi. Barcha ma'lumotlarni shu chatda muhokama qilishingiz mumkin.",
      descriptionRu:
        "Обмен логинами Telegram до обеспечения гарантии оплаты запрещен правилами безопасности платформы.",
    };
  }

  // 3. Telefon raqamlari (O'zbekiston va xalqaro formatlar)
  // Masalan: +998 90 123 45 67, 998901234567, 90 123-45-67, 901234567
  const uzbPhoneRegex =
    /(?:\+?998[\s.-]?)?\(?(?:9[01345789]|33|88|50|55|77)\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/;
  const phoneMatch = clean.match(uzbPhoneRegex);
  if (phoneMatch) {
    return {
      hasViolation: true,
      type: "phone",
      matchedText: phoneMatch[0],
      titleUz: "Telefon raqami almashish cheklangan",
      titleRu: "Обмен номерами телефонов ограничен",
      descriptionUz:
        "Shartnoma to'lovi amalga oshirilmasdan oldin telefon raqam berish taqiqlanadi. Platformadan tashqaridagi kelishuvlar uchun Bobo-Doda kafolat bermaydi.",
      descriptionRu:
        "Передача номеров телефонов до оплаты контракта запрещена. Платформа не гарантирует оплату при сделках вне сайта.",
    };
  }

  // Ketma-ket 7 yoki undan ortiq raqamlar (telefon yoki karta raqami berish urinishi)
  const digitSequenceRegex = /\b\d[\d\s.-]{6,14}\d\b/;
  const digitMatch = clean.match(digitSequenceRegex);
  if (digitMatch) {
    const rawDigits = digitMatch[0].replace(/\D/g, "");
    if (rawDigits.length >= 7 && rawDigits.length <= 16) {
      return {
        hasViolation: true,
        type: rawDigits.length === 16 ? "card" : "phone",
        matchedText: digitMatch[0],
        titleUz:
          rawDigits.length === 16
            ? "Karta raqami yuborish taqiqlangan"
            : "Telefon yoki kontakt raqami aniqlandi",
        titleRu:
          rawDigits.length === 16
            ? "Отправка номеров карт запрещена"
            : "Обнаружен номер телефона или контакт",
        descriptionUz:
          "To'g'ridan-to'g'ri to'lov yoki kontakt almashish firibgarlikka olib kelishi mumkin. To'lovlar faqat Bobo-Doda Escrow tizimi orqali amalga oshiriladi.",
        descriptionRu:
          "Прямые расчеты и обмен контактами вне платформы запрещены для предотвращения финансовых рисков.",
      };
    }
  }

  // 4. Qochish/aylanib o'tish iboralari (Off-platform phrases)
  const evasionPhrases = [
    {
      regex: /\b(?:telegramdan|telegramda|telegramga|tgdan|tgda|tgga)\s+(?:yozing|yoz|o'taylik|otaylik|bog'laning|boglaning)\b/i,
      label: "Telegramga chaqirish",
    },
    {
      regex: /\b(?:telefonga|telefonimga|raqamimga)\s+(?:qiling|tel\s*qiling|yozing)\b/i,
      label: "Telefonga chaqirish",
    },
    {
      regex: /\b(?:karta(?:ngiz)?ga|kartaga)\s+(?:tashlab|otkazib|o'tkazib|to'lab|tolab)\s+beraman\b/i,
      label: "To'g'ridan-to'g'ri to'lov taklifi",
    },
    {
      regex: /\b(?:напишите\s+в\s+телеграм|перейдем\s+в\s+тг|позвоните\s+мне\s+на\s+номер)\b/i,
      label: "Призыв к общению вне платформы",
    },
  ];

  for (const item of evasionPhrases) {
    const match = clean.match(item.regex);
    if (match) {
      return {
        hasViolation: true,
        type: "phrase",
        matchedText: match[0],
        titleUz: "Platformadan tashqariga chaqirish taqiqlanadi",
        titleRu: "Призыв к общению вне платформы запрещен",
        descriptionUz:
          "Bobo-Doda xavfsizlik tizimi sizni firibgarlikdan asraydi. Barcha muloqot va to'lovlar platforma ichida olib borilishi shart.",
        descriptionRu:
          "Все коммуникации и расчеты должны осуществляться строго внутри Bobo-Doda во избежание блокировки и рисков.",
      };
    }
  }

  return {
    hasViolation: false,
    titleUz: "",
    titleRu: "",
    descriptionUz: "",
    descriptionRu: "",
  };
}

/**
 * Platformadan tashqariga chaqirish urinishini Admin Ishonch va Xavfsizlik
 * (Trust & Safety) navbatiga (`sb2_trust_reports`) avtomatik ravishda qayd etadi.
 * Bu orqali qoidabuzarlar admin panelda (/admin/shikoyatlar) aks etadi va
 * xavfsizlik moderatori ularni ogohlantirishi yoki bloklashi mumkin.
 */
export function reportCircumventionViolation(params: {
  senderId?: string;
  senderName?: string;
  targetType: "message" | "job" | "proposal";
  targetId?: string;
  targetTitle?: string;
  matchedText?: string;
  violationType?: string;
  fullContent?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("sb2_trust_reports");
    const reports: TrustReport[] = raw ? (JSON.parse(raw) as TrustReport[]) : [];

    const now = new Date();
    const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000;
    const isDuplicate = reports.some(
      (r) =>
        r.reporterId === "system_anti_circumvention" &&
        r.targetId === (params.targetId || params.senderId) &&
        r.description?.includes(params.matchedText || "") &&
        new Date(r.createdAt).getTime() > fiveMinutesAgo
    );
    if (isDuplicate) return;

    const newReport: TrustReport = {
      id: `rep-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reporterId: "system_anti_circumvention",
      reporterName: "🛡️ Tizim Xavfsizlik Nazorati (Auto-Shield)",
      targetType: params.targetType === "job" ? "job" : "message",
      targetId: params.targetId || params.senderId || "unknown",
      targetTitle: params.targetTitle || "Chatdagi shaxsiy kontakt almashish urinishi",
      reasonType: "off_platform",
      description: `[AVTOMATIK XAVFSIZLIK QAYDI] Foydalanuvchi (${params.senderName || params.senderId || "Noma'lum"}) platformadan tashqarida aloqa o'rnatishga urindi. Aniqlangan: ${params.violationType || "kontakt"} ("${params.matchedText || ""}"). Matn: "${(params.fullContent || "").slice(0, 250)}"`,
      severity: "high",
      status: "new",
      actionTaken: "warned",
      createdAt: now.toISOString(),
    };

    reports.unshift(newReport);
    localStorage.setItem("sb2_trust_reports", JSON.stringify(reports));

    // Admin layout badge counters refresh
    window.dispatchEvent(new CustomEvent("bobododa:data-changed", { detail: { key: "sb2_trust_reports" } }));
  } catch (err) {
    console.error("Failed to auto-report circumvention:", err);
  }
}
