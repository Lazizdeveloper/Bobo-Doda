import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@/common/errors/domain-error';
import type { ProviderQueryResult } from '@/common/provider/provider-operation-state';
import type {
  CreatePayoutParams,
  CreatePayoutResult,
  PayoutProvider,
  PayoutWebhookRequest,
  QueryPayoutResult,
  VerifiedPayoutWebhookEvent,
} from '../payout-provider.interface';

export type TestPayoutScenario = 'OK' | 'REJECT' | 'TIMEOUT';

/** Bosqich 9, bo'lim 71 — `TestPaymentProvider.TestQueryScenario` bilan bir xil vositalar to'plami. */
export type TestPayoutQueryScenario = 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'NOT_FOUND' | 'UNKNOWN' | 'TIMEOUT' | 'MALFORMED' | 'AUTH_ERROR';

const SIGNATURE_HEADER = 'x-test-payout-signature';

/**
 * FAQAT test/dev (bo'lim 28/67) — `payout.module.ts` production'da fail-fast
 * rad etadi. `TestPaymentProvider` bilan BIR XIL falsafa, lekin ALOHIDA
 * sinf/sir — Payment va Payout MUSTAQIL provider munosabatlarini aks ettiradi.
 */
export class TestPayoutProvider implements PayoutProvider {
  readonly name = 'TEST';

  private readonly scenarios = new Map<string, TestPayoutScenario>();
  private readonly queryScenarios = new Map<string, TestPayoutQueryScenario>();

  constructor(private readonly webhookSecret: string) {}

  queueScenario(payoutId: string, scenario: TestPayoutScenario): void {
    this.scenarios.set(payoutId, scenario);
  }

  /** Bosqich 9 — reconciliation query natijasini oldindan belgilaydi (`providerPayoutId` bo'yicha). */
  queueQueryScenario(providerPayoutId: string, scenario: TestPayoutQueryScenario): void {
    this.queryScenarios.set(providerPayoutId, scenario);
  }

  async createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult> {
    // Bo'lim 45 — ATAYLAB `sellerId` bo'yicha (`payoutId` EMAS): `Payout.id`
    // server ichida generatsiya qilinadi, chaqiruvchi (test kodi) uni
    // so'rovdan OLDIN bilolmaydi — `sellerId` esa har doim oldindan ma'lum
    // (Payment'ning `contractId`/Refund'ning `paymentId` kaliti bilan bir
    // xil "chaqiruvdan oldin ma'lum resurs" mantig'i).
    const scenario = this.scenarios.get(params.sellerId) ?? 'OK';
    this.scenarios.delete(params.sellerId);
    await Promise.resolve();

    if (scenario === 'REJECT') {
      throw new DomainError('PAYOUT_PROVIDER_ERROR', 'Test payout provider: so‘rov rad etildi');
    }
    if (scenario === 'TIMEOUT') {
      throw new DomainError('PAYOUT_PROVIDER_UNAVAILABLE', 'Test payout provider: javob kelmadi');
    }

    return { providerPayoutId: `test_payout_${params.payoutId}`, providerCreatedAt: new Date() };
  }

  /**
   * Bosqich 9, bo'lim 4/13. `TestPaymentProvider.resolveQuery()` bilan bir
   * xil sabab bilan BIR MARTALIK ISTE'MOL QILINMAYDI — real provider bir
   * xil so'rov bir necha marta yuborilsa IZCHIL javob qaytaradi.
   */
  async queryPayout(providerPayoutId: string): Promise<QueryPayoutResult> {
    const scenario = this.queryScenarios.get(providerPayoutId) ?? 'UNKNOWN';
    await Promise.resolve();

    if (scenario === 'TIMEOUT') {
      throw new DomainError('PAYOUT_PROVIDER_UNAVAILABLE', 'Test payout provider: query javob bermadi (ambiguous)');
    }
    if (scenario === 'AUTH_ERROR') {
      throw new DomainError('PROVIDER_CONFIG_ERROR', 'Test payout provider: noto‘g‘ri credentials (simulyatsiya)');
    }
    if (scenario === 'MALFORMED') {
      const result: ProviderQueryResult = { state: 'UNKNOWN', providerReference: providerPayoutId };
      return result;
    }
    if (scenario === 'NOT_FOUND') {
      const result: ProviderQueryResult = { state: 'NOT_FOUND', providerReference: null };
      return result;
    }
    const result: ProviderQueryResult = { state: scenario, providerReference: providerPayoutId };
    return result;
  }

  verifyWebhook(req: PayoutWebhookRequest): VerifiedPayoutWebhookEvent {
    const header = req.headers[SIGNATURE_HEADER];
    const signature = Array.isArray(header) ? header[0] : header;
    if (!signature) {
      throw new DomainError('PAYOUT_WEBHOOK_INVALID', 'Imzo header topilmadi');
    }
    if (!this.signatureMatches(req.rawBody, signature)) {
      throw new DomainError('PAYOUT_WEBHOOK_INVALID', 'Imzo mos emas');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      throw new DomainError('PAYOUT_WEBHOOK_INVALID', 'Yaroqsiz JSON');
    }
    return this.parsePayload(payload);
  }

  private parsePayload(payload: unknown): VerifiedPayoutWebhookEvent {
    if (typeof payload !== 'object' || payload === null) {
      throw new DomainError('PAYOUT_WEBHOOK_INVALID', 'Yaroqsiz payload');
    }
    const body = payload as Record<string, unknown>;
    const status = body.status;
    if (
      typeof body.eventId !== 'string' ||
      typeof body.providerPayoutId !== 'string' ||
      typeof body.eventType !== 'string' ||
      typeof body.amount !== 'number' ||
      !Number.isInteger(body.amount) ||
      typeof body.currency !== 'string' ||
      (status !== 'SUCCEEDED' && status !== 'FAILED')
    ) {
      throw new DomainError('PAYOUT_WEBHOOK_INVALID', 'Majburiy maydon yetishmayapti yoki noto‘g‘ri tur');
    }
    return {
      providerEventId: body.eventId,
      providerPayoutId: body.providerPayoutId,
      eventType: body.eventType,
      status,
      amountTiyin: BigInt(body.amount),
      currency: body.currency,
    };
  }

  private signatureMatches(rawBody: Buffer, signatureHex: string): boolean {
    const expected = this.signPayload(rawBody);
    let provided: Buffer;
    try {
      provided = Buffer.from(signatureHex, 'hex');
    } catch {
      return false;
    }
    const expectedBuf = Buffer.from(expected, 'hex');
    return provided.length === expectedBuf.length && timingSafeEqual(provided, expectedBuf);
  }

  signPayload(rawBody: Buffer): string {
    return createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
  }
}

export { SIGNATURE_HEADER as TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER };
