import { dictionary, type Lang } from "@/lib/i18n/dictionary";
import { en } from "@/lib/i18n/en";

/**
 * Tizimda mavjud audit resurs turlari (Prisma/DB bo'yicha).
 */
export const AUDIT_RESOURCE_OPTIONS = [
  "USER",
  "CONTRACT",
  "SERVICE",
  "DISPUTE",
  "PAYMENT",
  "PAYOUT",
  "REFUND",
  "CATEGORY",
  "MILESTONE",
  "OUTBOX_EVENT",
  "STAFF_MEMBER",
  "SELLER_APPLICATION",
  "LEDGER_TRANSACTION",
  "FINANCIAL_ANOMALY",
] as const;

export type AuditResourceType = (typeof AUDIT_RESOURCE_OPTIONS)[number];

/**
 * Resurs bo'yicha bog'liq harakatlar xaritasi (filtr tanlashni qulaylashtirish uchun).
 */
export const AUDIT_ACTIONS_BY_RESOURCE: Record<string, string[]> = {
  USER: ["USER_REACTIVATED", "USER_SUSPENDED", "USER_BLOCKED", "USER_PASSWORD_RESET"],
  CONTRACT: [
    "CONTRACT_CREATED",
    "CONTRACT_ACCEPTED",
    "CONTRACT_REJECTED",
    "CONTRACT_CANCELLED",
    "CONTRACT_COMPLETED",
  ],
  MILESTONE: ["MILESTONE_SUBMITTED", "MILESTONE_REVISION_REQUESTED", "MILESTONE_APPROVED"],
  DISPUTE: [
    "DISPUTE_OPENED",
    "DISPUTE_REVIEW_STARTED",
    "DISPUTE_EVIDENCE_ADDED",
    "DISPUTE_RESOLVED",
    "DISPUTE_REJECTED",
    "DISPUTE_CANCELLED",
  ],
  PAYMENT: [
    "PAYMENT_CREATED",
    "PAYMENT_PROVIDER_CREATED",
    "PAYMENT_SUCCEEDED",
    "PAYMENT_FAILED",
    "PAYMENT_CANCELLED",
    "PAYMENT_RECONCILED",
    "PAYMENT_RECONCILIATION_FAILED",
    "PAYMENT_WEBHOOK_MISMATCH",
    "PAYMENT_WEBHOOK_CONFLICT",
    "PAYME_CANCEL_AFTER_PERFORM_REFUSED",
  ],
  PAYOUT: [
    "PAYOUT_CREATED",
    "PAYOUT_PROCESSING",
    "PAYOUT_SUCCEEDED",
    "PAYOUT_FAILED",
    "PAYOUT_RECONCILED",
    "PAYOUT_RECONCILIATION_FAILED",
    "PAYOUT_WEBHOOK_MISMATCH",
    "PAYOUT_WEBHOOK_CONFLICT",
  ],
  REFUND: [
    "REFUND_CREATED",
    "REFUND_PROCESSING",
    "REFUND_SUCCEEDED",
    "REFUND_FAILED",
    "REFUND_RECONCILED",
    "REFUND_RECONCILIATION_FAILED",
    "REFUND_WEBHOOK_MISMATCH",
    "REFUND_WEBHOOK_CONFLICT",
  ],
  OUTBOX_EVENT: ["OUTBOX_EVENT_DEAD", "OUTBOX_MANUAL_RETRY_REQUESTED"],
  SERVICE: ["SERVICE_APPROVED", "SERVICE_REJECTED", "SERVICE_FORCE_PAUSED"],
  CATEGORY: ["CATEGORY_CREATED", "CATEGORY_ARCHIVED", "CATEGORY_ACTIVATED"],
  SELLER_APPLICATION: [
    "SELLER_APPLICATION_SUBMITTED",
    "SELLER_APPLICATION_APPROVED",
    "SELLER_APPLICATION_REJECTED",
    "SELLER_SUSPENDED",
    "SELLER_REINSTATED",
  ],
  STAFF_MEMBER: [
    "STAFF_CREATED",
    "STAFF_PASSWORD_CHANGED",
    "STAFF_PASSWORD_RESET",
    "STAFF_PERMISSIONS_UPDATED",
    "STAFF_REACTIVATED",
    "STAFF_SUSPENDED",
    "STAFF_DISABLED",
    "STAFF_SESSIONS_REVOKED",
    "STAFF_TOTP_ENROLLMENT_STARTED",
    "STAFF_TOTP_ENABLED",
    "STAFF_TOTP_DISABLED",
    "STAFF_TOTP_RESET",
  ],
  LEDGER_TRANSACTION: [
    "LEDGER_PAYMENT_FUNDED",
    "LEDGER_CONTRACT_SETTLED",
    "LEDGER_PAYOUT_RESERVED",
    "LEDGER_PAYOUT_RELEASED",
    "LEDGER_REFUND_POSTED",
    "LEDGER_DISPUTE_HELD",
    "LEDGER_DISPUTE_RELEASED",
    "LEDGER_DISPUTE_RESOLVED",
  ],
  FINANCIAL_ANOMALY: ["FINANCIAL_ANOMALY_ACKNOWLEDGED"],
};

/**
 * Barcha harakatlarning yagona tartiblangan ro'yxati.
 */
export const ALL_AUDIT_ACTIONS = Array.from(
  new Set(Object.values(AUDIT_ACTIONS_BY_RESOURCE).flat())
);

function getTranslation(key: string, lang: Lang): string | undefined {
  if (lang === "en") {
    return en[key] ?? dictionary[key]?.uz;
  }
  if (lang === "ru") {
    return dictionary[key]?.ru ?? dictionary[key]?.uz;
  }
  return dictionary[key]?.uz;
}

/**
 * Harakat (action) kodini odam o'qiydigan matnga aylantiradi.
 * Masalan: `OUTBOX_EVENT_DEAD` -> "Xabarnoma yetkazib bo'lmadi (DLQ)"
 */
export function formatAuditAction(action: string, lang: Lang = "uz"): string {
  const clean = action?.trim();
  if (!clean) return "—";

  const direct = getTranslation(`audit.act.${clean}`, lang);
  if (direct) return direct;

  const alt = getTranslation(`audit.action.${clean}`, lang);
  if (alt) return alt;

  // Noma'lum yangi kodlar uchun odam o'qiydigan sarlavhaga aylantirish (fallback)
  return clean
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Resurs turini (resourceType) odam o'qiydigan matnga aylantiradi.
 * Masalan: `OUTBOX_EVENT` -> "Xabarnoma", `USER` -> "Foydalanuvchi"
 */
export function formatAuditResource(resourceType: string, lang: Lang = "uz"): string {
  const clean = resourceType?.trim();
  if (!clean) return "—";

  const direct = getTranslation(`audit.res.${clean}`, lang);
  if (direct) return direct;

  const alt = getTranslation(`audit.resource.${clean}`, lang);
  if (alt) return alt;

  return clean
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Bajaruvchi turini (actorType) odam o'qiydigan matnga aylantiradi.
 * Masalan: `STAFF` -> "Xodim", `SYSTEM` -> "Tizim"
 */
export function formatAuditActorType(actorType: string, lang: Lang = "uz"): string {
  const clean = actorType?.trim();
  if (!clean) return "";

  const direct = getTranslation(`audit.actorType.${clean}`, lang);
  if (direct) return direct;

  const upper = clean.toUpperCase();
  if (upper === "STAFF") {
    return lang === "ru" ? "Сотрудник" : lang === "en" ? "Staff" : "Xodim";
  }
  if (upper === "USER") {
    return lang === "ru" ? "Пользователь" : lang === "en" ? "User" : "Foydalanuvchi";
  }
  if (upper === "SYSTEM") {
    return lang === "ru" ? "Система" : lang === "en" ? "System" : "Tizim";
  }

  return clean;
}

/**
 * Bajaruvchi nomini (actorName) odam o'qiydigan formatda ko'rsatadi.
 * Masalan: `outbox-worker` -> "Tizim (Xabarnomalar xizmati)"
 */
export function formatAuditActorName(actorName: string, lang: Lang = "uz"): string {
  const clean = actorName?.trim();
  if (!clean) return "—";

  const direct = getTranslation(`audit.actorName.${clean}`, lang);
  if (direct) return direct;

  if (clean.toLowerCase() === "system") {
    return lang === "ru" ? "Системный процесс" : lang === "en" ? "System process" : "Tizim jarayoni";
  }

  if (clean.endsWith("-worker") || clean.endsWith("-service")) {
    return `${lang === "ru" ? "Система" : lang === "en" ? "System" : "Tizim"} (${clean})`;
  }

  return clean;
}
