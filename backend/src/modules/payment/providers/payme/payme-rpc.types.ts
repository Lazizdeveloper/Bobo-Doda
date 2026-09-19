/**
 * Bosqich 12 — Payme Merchant API JSON-RPC protokoli. Manba: rasmiy
 * `developer.help.paycom.uz` (Metody Merchant API + Protokol Merchant API
 * bo'limlari, 2026-09 holatiga ko'ra tekshirilgan). Har bir kod/maydon
 * nomi hujjatdan olingan — o'ylab topilmagan.
 *
 * Umumiy qoida (bo'lim 6/7) — javob HAR DOIM HTTP 200, `{result}` YOKI
 * `{error}` (ikkalasi birga EMAS), `jsonrpc` maydoni YO'Q.
 */

/** Umumiy protokol xatolari (`Формат ответа`/`Общие ошибки`). */
export const PAYME_ERROR = {
  /** So'rov metodi POST emas. */
  NOT_POST: -32300,
  /** JSON parse xatosi. */
  PARSE_ERROR: -32700,
  /** Majburiy maydon yo'q yoki tipi mos emas. */
  INVALID_REQUEST: -32600,
  /** So'ralgan metod topilmadi (yoki `PAYMENT_PROVIDER !== 'PAYME'`). */
  METHOD_NOT_FOUND: -32601,
  /** Basic auth yo'q/xato — rasmiy protokolda alohida 401 semantikasi YO'Q, shu kod ishlatiladi. */
  INSUFFICIENT_PRIVILEGE: -32504,
  /** Ichki server xatosi. */
  INTERNAL: -32400,

  /** CheckPerformTransaction/CreateTransaction — noto'g'ri summa. */
  INVALID_AMOUNT: -31001,
  /** PerformTransaction/CancelTransaction/CheckTransaction — topilmadi. */
  TRANSACTION_NOT_FOUND: -31003,
  /** CancelTransaction — buyurtma to'liq bajarilgan, bekor qilib bo'lmaydi. */
  CANNOT_CANCEL_COMPLETED: -31007,
  /** Holat diagrammasi bo'yicha amalni bajarib bo'lmaydi (masalan duplicate CreateTransaction boshqa account/amount bilan). */
  OPERATION_NOT_ALLOWED: -31008,
  /** `account` maydoni xato/topilmadi oralig'i boshlanishi — bo'lim 11: bizda yagona maydon `payment_id`. */
  ACCOUNT_NOT_FOUND: -31050,
} as const;

export type PaymeErrorCode = (typeof PAYME_ERROR)[keyof typeof PAYME_ERROR];

/** Uch tilli xabar — rasmiy formatga mos (`{ru,uz,en}`). */
export interface PaymeErrorMessage {
  ru: string;
  uz: string;
  en: string;
}

export interface PaymeRpcRequest {
  method: string;
  params: Record<string, unknown>;
  id: number | string;
}

export interface PaymeRpcSuccessResponse {
  result: Record<string, unknown>;
  id: number | string;
}

export interface PaymeRpcErrorResponse {
  error: { code: number; message: PaymeErrorMessage; data?: string };
  id: number | string | null;
}

/** Payme protokoli raqamli transaksiya holati (bo'lim 8/9 — `PaymentStatus`dan ALOHIDA). */
export const PAYME_STATE = {
  CREATED: 1,
  PERFORMED: 2,
  CANCELLED_BEFORE_PERFORM: -1,
  CANCELLED_AFTER_PERFORM: -2,
} as const;

/** Bizning `account` obyektidagi yagona identifikator maydoni (bo'lim 11 — stabil, taxmin qilib bo'lmaydigan UUIDv7 `Payment.id`). */
export const PAYME_ACCOUNT_FIELD = 'payment_id';

/**
 * Bo'lim 4/32 — `PaymeMerchantController`/`Service` uchun to'liq konfiguratsiya.
 * `PAYMENT_PROVIDER` (generic `PaymentProvider` capability interfeysi,
 * `PaymentService.create()` checkout URL uchun) dan ATAYLAB ALOHIDA token —
 * RPC controller "Payme faolmi" degan savolga shu token orqali javob
 * beradi (config qayta o'qish emas, BITTA DI qiymati — test'da
 * `overrideProvider` bilan osongina almashtiriladi, real `AppConfigService`
 * ga tegmasdan).
 */
export const PAYME_MERCHANT_CONFIG = Symbol('PAYME_MERCHANT_CONFIG');

export interface PaymeMerchantConfig {
  merchantId: string;
  login: string;
  key: string;
  checkoutUrl: string;
}
