/**
 * Bo'lim 28 — Payout uchun ALOHIDA provider abstraksiyasi (Payment bilan
 * BIR XIL provider bo'lishi SHART emas — real hayotda bank/karta payout
 * rail'i to'lov gateway'idan mutlaqo boshqa kompaniya bo'lishi mumkin).
 * `PaymentProvider` bilan bir xil naqsh (`infra/sms`dan meros) — real
 * provider spec yo'q bo'lsa faqat chegara + test provider.
 */
export const PAYOUT_PROVIDER = Symbol('PAYOUT_PROVIDER');

export interface CreatePayoutParams {
  /** Bizning barqaror ID — provider'ga reference sifatida (bo'lim 13/51 bilan bir xil naqsh). */
  payoutId: string;
  sellerId: string;
  /** Bo'lim 36 — opaque referens (masalan "Uzcard •••• 1234"), xom bank/karta ma'lumoti EMAS. */
  destinationReference: string;
  amountTiyin: bigint;
  currency: string;
}

export interface CreatePayoutResult {
  providerPayoutId: string;
  providerCreatedAt: Date;
}

export type ProviderPayoutStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

export interface QueryPayoutResult {
  providerPayoutId: string;
  status: ProviderPayoutStatus;
}

export interface PayoutWebhookRequest {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

export interface VerifiedPayoutWebhookEvent {
  providerEventId: string;
  providerPayoutId: string;
  eventType: string;
  status: 'SUCCEEDED' | 'FAILED';
  amountTiyin: bigint;
  currency: string;
}

export interface PayoutProvider {
  readonly name: string;

  createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult>;

  /** Bo'lim 31 — reconciliation. Provider qo'llamasa `undefined` qoldiriladi. */
  queryPayout?(providerPayoutId: string): Promise<QueryPayoutResult>;

  /** RAW baytlar ustida — Bosqich 5/16 bilan bir xil naqsh. */
  verifyWebhook(req: PayoutWebhookRequest): VerifiedPayoutWebhookEvent;
}
