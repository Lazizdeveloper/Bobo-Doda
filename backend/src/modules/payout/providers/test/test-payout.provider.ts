import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@/common/errors/domain-error';
import type {
  CreatePayoutParams,
  CreatePayoutResult,
  PayoutProvider,
  PayoutWebhookRequest,
  VerifiedPayoutWebhookEvent,
} from '../payout-provider.interface';

export type TestPayoutScenario = 'OK' | 'REJECT' | 'TIMEOUT';

const SIGNATURE_HEADER = 'x-test-payout-signature';

/**
 * FAQAT test/dev (bo'lim 28/67) — `payout.module.ts` production'da fail-fast
 * rad etadi. `TestPaymentProvider` bilan BIR XIL falsafa, lekin ALOHIDA
 * sinf/sir — Payment va Payout MUSTAQIL provider munosabatlarini aks ettiradi.
 */
export class TestPayoutProvider implements PayoutProvider {
  readonly name = 'TEST';

  private readonly scenarios = new Map<string, TestPayoutScenario>();

  constructor(private readonly webhookSecret: string) {}

  queueScenario(payoutId: string, scenario: TestPayoutScenario): void {
    this.scenarios.set(payoutId, scenario);
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
