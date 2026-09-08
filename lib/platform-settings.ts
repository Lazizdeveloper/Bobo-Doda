/**
 * Platforma operatsion sozlamalari — admin paneli va ilova uchun YAGONA MANBA.
 *
 * Ilgari ikki kalit bor edi va ular hech qachon kesishmasdi:
 * admin `sb2_platform_settings` ga yozardi, ilova esa `sb2_system_settings`
 * dan o'qirdi. Natijada admin paneldagi har bir sozlama bezak edi — "escrow
 * avto-chiqarish kunlari" ni o'zgartirish hech narsani o'zgartirmasdi.
 *
 * Endi ikkala tomon ham shu moduldan o'tadi. `lib/fees.ts` (xizmat haqi
 * foizi) ataylab bu yerga KIRITILMAGAN: u landing sahifasi va yordam
 * matnlariga ham import qilinadi (build vaqtida), shuning uchun ish vaqtida
 * o'zgarsa va'da bilan hisob-kitob bir-biriga mos kelmay qolardi. Uni
 * o'zgartirish backend ishi.
 */

export const PLATFORM_SETTINGS_KEY = "sb2_platform_settings";

export const SETTING_KEYS = {
  platformCommissionPercent: "platform_commission_percent",
  escrowAutoReleaseDays: "escrow_auto_release_days",
  minPayoutAmount: "min_payout_amount",
  instantOffersEnabled: "marketplace_instant_offer_enabled",
  registrationEnabled: "registration_enabled",
  paymentsPaused: "payments_paused",
} as const;

export interface PlatformSettingsValues {
  /** Platforma komissiya stavkasi foizda (0-50%) */
  platformCommissionPercent: number;
  /** Topshirilgan bosqich necha kundan keyin avtomatik qabul qilinadi */
  escrowAutoReleaseDays: number;
  /** Bir marta yechish mumkin bo'lgan eng kichik summa (UZS) */
  minPayoutAmount: number;
  /** To'g'ridan-to'g'ri taklif (A yo'l) yoqilganmi */
  instantOffersEnabled: boolean;
  /** Yangi ro'yxatdan o'tish ochiqmi */
  registrationEnabled: boolean;
  /** To'lovlar vaqtincha to'xtatilganmi (kill-switch) */
  paymentsPaused: boolean;
}

export const PLATFORM_SETTING_DEFAULTS: PlatformSettingsValues = {
  platformCommissionPercent: 10,
  escrowAutoReleaseDays: 3,
  minPayoutAmount: 50_000,
  instantOffersEnabled: true,
  registrationEnabled: true,
  paymentsPaused: false,
};

interface StoredSetting {
  key: string;
  value: string | number | boolean;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Joriy sozlamalar. Noto'g'ri/yo'q qiymat sukut bo'yicha qiymatga tushadi —
    admin panelda buzilgan yozuv ilovani to'xtatib qo'ymasligi kerak. */
export function getPlatformSettings(): PlatformSettingsValues {
  if (typeof window === "undefined") return PLATFORM_SETTING_DEFAULTS;
  let stored: StoredSetting[] = [];
  try {
    const raw = window.localStorage.getItem(PLATFORM_SETTINGS_KEY);
    stored = raw ? (JSON.parse(raw) as StoredSetting[]) : [];
  } catch {
    return PLATFORM_SETTING_DEFAULTS;
  }
  if (!Array.isArray(stored)) return PLATFORM_SETTING_DEFAULTS;
  const byKey = new Map(stored.map((s) => [s?.key, s?.value]));
  const bool = (key: string, fallback: boolean) => {
    const v = byKey.get(key);
    return typeof v === "boolean" ? v : fallback;
  };
  return {
    platformCommissionPercent: num(
      byKey.get(SETTING_KEYS.platformCommissionPercent),
      PLATFORM_SETTING_DEFAULTS.platformCommissionPercent,
      0,
      50
    ),
    escrowAutoReleaseDays: num(
      byKey.get(SETTING_KEYS.escrowAutoReleaseDays),
      PLATFORM_SETTING_DEFAULTS.escrowAutoReleaseDays,
      1,
      30
    ),
    minPayoutAmount: num(
      byKey.get(SETTING_KEYS.minPayoutAmount),
      PLATFORM_SETTING_DEFAULTS.minPayoutAmount,
      0,
      100_000_000
    ),
    instantOffersEnabled: bool(
      SETTING_KEYS.instantOffersEnabled,
      PLATFORM_SETTING_DEFAULTS.instantOffersEnabled
    ),
    registrationEnabled: bool(
      SETTING_KEYS.registrationEnabled,
      PLATFORM_SETTING_DEFAULTS.registrationEnabled
    ),
    paymentsPaused: bool(
      SETTING_KEYS.paymentsPaused,
      PLATFORM_SETTING_DEFAULTS.paymentsPaused
    ),
  };
}
