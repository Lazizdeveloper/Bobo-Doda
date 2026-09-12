/**
 * Provider-agnostik chegara (Bosqich 5, bo'lim 6). Business layer
 * (`PaymentService`) hech qachon provider-specific kodga (HTTP client,
 * signature format, error kod) bog'lanmaydi — faqat shu interfeys orqali.
 *
 * Real Payme/Click implementatsiyasi — Bosqich 5 SCOPE'IDAN TASHQARI
 * (bo'lim 7): signature algoritmi/callback format/merchant auth repo yoki
 * docs'da HECH QAYERDA yo'q, shuning uchun o'ylab topilmaydi. Faqat shu
 * interfeys + `providers/test/` (test double) yoziladi; real provider
 * qo'shilganda `providers/payme/` kabi YANGI papka + `payment.module.ts`
 * dagi bitta registry qatori qo'shiladi — boshqa hech narsa o'zgarmaydi
 * (SMS provayder abstraksiyasi bilan bir xil naqsh — `infra/sms`).
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreatePaymentParams {
  /**
   * Bizning barqaror ID (`Payment.id`) — provider'ga merchant reference
   * sifatida yuboriladi (bo'lim 14): har retry'da YANGI Payment qatori
   * yaratiladi, shuning uchun reference ham tabiiy ravishda o'zgaradi —
   * lekin BITTA urinish ichida hech qachon qayta generatsiya qilinmaydi
   * (reconciliation uchun barqaror).
   */
  paymentId: string;
  contractId: string;
  /** BigInt tiyin — HAR DOIM `Contract.agreedAmount`dan (bo'lim 9). */
  amountTiyin: bigint;
  currency: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  providerCreatedAt: Date;
  /** Redirect-asosli oqim (Payme/Click) uchun — hozircha ishlatilmaydi (test provider sinxron). */
  redirectUrl?: string;
}

export type ProviderPaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface QueryPaymentResult {
  providerPaymentId: string;
  status: ProviderPaymentStatus;
}

export interface WebhookRequest {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

/** Bosqich 7, bo'lim 51 — `refund.id` barqaror reference sifatida (bo'lim 13/14 bilan bir xil naqsh). */
export interface CreateRefundParams {
  refundId: string;
  paymentId: string;
  providerPaymentId: string;
  amountTiyin: bigint;
  currency: string;
}

export interface CreateRefundResult {
  providerRefundId: string;
  providerCreatedAt: Date;
}

export interface VerifiedPaymentWebhookEvent {
  kind: 'PAYMENT';
  /** Provider'ning o'z hodisa identifikatori — dedup kaliti (`PaymentProviderEvent.providerEventId`). */
  providerEventId: string;
  providerPaymentId: string;
  eventType: string;
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  amountTiyin: bigint;
  currency: string;
}

/** Bosqich 7 — Refund HAM shu provider/route orqali (bir xil merchant-provider munosabati — bo'lim 4). */
export interface VerifiedRefundWebhookEvent {
  kind: 'REFUND';
  providerEventId: string;
  providerRefundId: string;
  eventType: string;
  status: 'SUCCEEDED' | 'FAILED';
  amountTiyin: bigint;
  currency: string;
}

/**
 * `kind` diskriminatori — bitta webhook route (`POST /payments/webhooks/:provider`)
 * ham Payment, ham Refund hodisalarini qabul qiladi (Payout — ALOHIDA route/
 * provider, bo'lim 28). Bizning TEST provider payload'iga o'zi `kind` maydonini
 * qo'shadi — bu HAQIQIY provider protokolini taqlid qilish EMAS, faqat shu
 * ikkala hodisani bitta route ichida ajratish uchun ICHKI konvensiya.
 */
export type VerifiedProviderEvent = VerifiedPaymentWebhookEvent | VerifiedRefundWebhookEvent;

export interface PaymentProvider {
  readonly name: string;

  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

  /** Bo'lim 31 — reconciliation. Provider qo'llamasa `undefined` qoldiriladi (uydirma qilinmaydi). */
  queryPayment?(providerPaymentId: string): Promise<QueryPaymentResult>;

  cancelPayment?(providerPaymentId: string): Promise<void>;

  /** Bosqich 7 — bo'lim 12. Real provider bu metodni qo'llab-quvvatlamasa ham chegara shu yerda turadi. */
  refundPayment(params: CreateRefundParams): Promise<CreateRefundResult>;

  /**
   * Signature/format tekshiradi VA payloadni parslaydi — RAW BAYTLAR
   * ustida (bo'lim 16/17). Yaroqsiz bo'lsa `DomainError('PAYMENT_WEBHOOK_INVALID')`
   * tashlaydi (401 — ADR-03: "imzo yaroqsiz → 401, hech narsa yozilmaydi").
   */
  verifyWebhook(req: WebhookRequest): VerifiedProviderEvent;
}
