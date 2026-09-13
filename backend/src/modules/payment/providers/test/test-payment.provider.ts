import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@/common/errors/domain-error';
import type { ProviderQueryResult } from '@/common/provider/provider-operation-state';
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  CreateRefundParams,
  CreateRefundResult,
  PaymentProvider,
  QueryPaymentResult,
  QueryRefundResult,
  VerifiedPaymentWebhookEvent,
  VerifiedProviderEvent,
  VerifiedRefundWebhookEvent,
  WebhookRequest,
} from '../payment-provider.interface';

export type TestScenario = 'OK' | 'REJECT' | 'TIMEOUT';

/**
 * Bosqich 9, bo'lim 71 — reconciliation query stsenariylari, YARATISH
 * stsenariylaridan (`TestScenario`) ALOHIDA kalit fazosida (`queryScenarios`
 * Map) — chunki query'ning kaliti (`providerPaymentId`/`providerRefundId`,
 * masalan "test_p1") yaratish kalitidan (`contractId`/`paymentId`) FARQ
 * qiladi, ikkalasi bir vaqtda mustaqil boshqarilishi kerak.
 */
export type TestQueryScenario = 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'NOT_FOUND' | 'UNKNOWN' | 'TIMEOUT' | 'MALFORMED' | 'AUTH_ERROR';

const SIGNATURE_HEADER = 'x-test-signature';

/**
 * FAQAT test/dev uchun (bo'lim 45) — `payment.module.ts` production'da
 * (`NODE_ENV=production`) buni tanlashni FAIL-FAST rad etadi. Haqiqiy
 * tarmoq chaqiruvi YO'Q — sinxron, deterministik.
 *
 * Signature sxemasi (HMAC-SHA256, raw body ustida) — BIZNING O'ZIMIZNIKI,
 * hech qanday haqiqiy provider protokolini taqlid QILMAYDI (bo'lim 7 taqiqi:
 * o'ylab topilgan sxema PRODUCTION uchun yozilmaydi — bu FAQAT shu test
 * double'ning o'zini sinash uchun, `signPayload()` orqali e2e testlarda
 * ham ishlatiladi).
 *
 * Bosqich 7 — payload'dagi ixtiyoriy `kind` maydoni ("PAYMENT"|"REFUND")
 * orqali ikkala hodisa turi BITTA webhook route'da ajratiladi (`kind`
 * berilmasa — orqaga moslik uchun sukut "PAYMENT", Bosqich 5 testlari
 * o'zgarishsiz ishlaydi).
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly name = 'TEST';

  /** e2e/unit testlar `contractId`/`refundId` bo'yicha KEYINGI provider chaqiruvi natijasini boshqarish uchun. */
  private readonly scenarios = new Map<string, TestScenario>();
  /** Bosqich 9 — `queryPayment`/`queryRefund` uchun, provider REFERENSI (masalan "test_p1") bo'yicha. */
  private readonly queryScenarios = new Map<string, TestQueryScenario>();

  constructor(private readonly webhookSecret: string) {}

  /** Faqat test kodidan chaqiriladi (`app.get(PAYMENT_PROVIDER)`). */
  queueScenario(key: string, scenario: TestScenario): void {
    this.scenarios.set(key, scenario);
  }

  /** Bosqich 9 — reconciliation query natijasini oldindan belgilaydi (`providerPaymentId`/`providerRefundId` bo'yicha). */
  queueQueryScenario(providerReference: string, scenario: TestQueryScenario): void {
    this.queryScenarios.set(providerReference, scenario);
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const scenario = this.scenarios.get(params.contractId) ?? 'OK';
    this.scenarios.delete(params.contractId);
    await Promise.resolve(); // haqiqiy provider — tarmoq I/O — bilan bir xil async chegara

    if (scenario === 'REJECT') {
      // Deterministik rad — bo'lim 30: DomainError taksonomiyasi orqali.
      throw new DomainError('PAYMENT_PROVIDER_ERROR', 'Test provider: so‘rov rad etildi');
    }
    if (scenario === 'TIMEOUT') {
      // Ambiguous (bo'lim 11) — "provider yaratgan bo'lishi mumkin, bilmaymiz".
      throw new DomainError('PAYMENT_PROVIDER_UNAVAILABLE', 'Test provider: javob kelmadi');
    }

    return {
      providerPaymentId: `test_${params.paymentId}`,
      providerCreatedAt: new Date(),
    };
  }

  async refundPayment(params: CreateRefundParams): Promise<CreateRefundResult> {
    // Bo'lim 45 — ATAYLAB `paymentId` bo'yicha (`refundId` EMAS): `Refund.id`
    // server ichida generatsiya qilinadi, chaqiruvchi (test kodi) uni
    // so'rovdan OLDIN bilolmaydi — `createPayment`ning `contractId` kaliti
    // bilan bir xil "chaqiruvdan oldin ma'lum resurs" mantig'i, shu orqali
    // e2e testlar refund yaratishdan OLDIN REJECT/TIMEOUT navbatga qo'ya oladi.
    const scenario = this.scenarios.get(params.paymentId) ?? 'OK';
    this.scenarios.delete(params.paymentId);
    await Promise.resolve();

    if (scenario === 'REJECT') {
      throw new DomainError('PAYMENT_PROVIDER_ERROR', 'Test provider: refund rad etildi');
    }
    if (scenario === 'TIMEOUT') {
      throw new DomainError('PAYMENT_PROVIDER_UNAVAILABLE', 'Test provider: refund javobi kelmadi');
    }

    return {
      providerRefundId: `test_refund_${params.refundId}`,
      providerCreatedAt: new Date(),
    };
  }

  /** Bosqich 9, bo'lim 4/8. */
  async queryPayment(providerPaymentId: string): Promise<QueryPaymentResult> {
    return this.resolveQuery(providerPaymentId);
  }

  /** Bosqich 9, bo'lim 4/12. */
  async queryRefund(providerRefundId: string): Promise<QueryRefundResult> {
    return this.resolveQuery(providerRefundId);
  }

  private async resolveQuery(providerReference: string): Promise<ProviderQueryResult> {
    // Bo'lim 4/54 — YARATISH stsenariyalaridan (`scenarios`) FARQLI ravishda
    // BIR MARTALIK ISTE'MOL QILINMAYDI: haqiqiy provider bir xil operatsiya
    // uchun bir necha marta so'ralganda IZCHIL javob qaytaradi (multi-worker
    // xavfsizligi — bo'lim 36: "provider so'rovlari bir necha marta
    // ishlashi mumkin, bu normal"). Testda holat o'zgarishini simulyatsiya
    // qilish uchun chaqiruvchi `queueQueryScenario()`ni QAYTA chaqiradi.
    const scenario = this.queryScenarios.get(providerReference) ?? 'UNKNOWN';
    await Promise.resolve(); // haqiqiy provider — tarmoq I/O — bilan bir xil async chegara

    if (scenario === 'TIMEOUT') {
      throw new DomainError('PAYMENT_PROVIDER_UNAVAILABLE', 'Test provider: query javob bermadi (ambiguous)');
    }
    if (scenario === 'AUTH_ERROR') {
      // Bo'lim 35 — config/auth xatosi, ambiguous EMAS: qayta-qayta so'rash
      // yordam bermaydi, `ReconciliationService` shu kodni ko'rsa batch'ni to'xtatadi.
      throw new DomainError('PROVIDER_CONFIG_ERROR', 'Test provider: noto‘g‘ri credentials (simulyatsiya)');
    }
    if (scenario === 'MALFORMED') {
      // Bo'lim 32/41 — "provider javob berdi, lekin tushunarsiz" — ISTISNO
      // EMAS, oddiy `UNKNOWN` natija (aniq semantik farq: bu ambiguous
      // TRANSPORT xatosi emas, muvaffaqiyatli-lekin-tushunarsiz JAVOB).
      return { state: 'UNKNOWN', providerReference };
    }
    if (scenario === 'NOT_FOUND') {
      return { state: 'NOT_FOUND', providerReference: null };
    }
    return { state: scenario, providerReference };
  }

  verifyWebhook(req: WebhookRequest): VerifiedProviderEvent {
    const header = req.headers[SIGNATURE_HEADER];
    const signature = Array.isArray(header) ? header[0] : header;
    if (!signature) {
      throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Imzo header topilmadi');
    }

    if (!this.signatureMatches(req.rawBody, signature)) {
      throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Imzo mos emas');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Yaroqsiz JSON');
    }

    return this.parseVerifiedPayload(payload);
  }

  private parseVerifiedPayload(payload: unknown): VerifiedProviderEvent {
    if (typeof payload !== 'object' || payload === null) {
      throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Yaroqsiz payload');
    }
    const body = payload as Record<string, unknown>;
    const kind = body.kind ?? 'PAYMENT';
    if (kind === 'REFUND') return this.parseRefundPayload(body);
    if (kind === 'PAYMENT') return this.parsePaymentPayload(body);
    throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Noma’lum hodisa turi (kind)');
  }

  private parsePaymentPayload(body: Record<string, unknown>): VerifiedPaymentWebhookEvent {
    const status = body.status;
    if (
      typeof body.eventId !== 'string' ||
      typeof body.providerPaymentId !== 'string' ||
      typeof body.eventType !== 'string' ||
      typeof body.amount !== 'number' ||
      !Number.isInteger(body.amount) ||
      typeof body.currency !== 'string' ||
      (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'CANCELLED')
    ) {
      throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Majburiy maydon yetishmayapti yoki noto‘g‘ri tur');
    }
    return {
      kind: 'PAYMENT',
      providerEventId: body.eventId,
      providerPaymentId: body.providerPaymentId,
      eventType: body.eventType,
      status,
      amountTiyin: BigInt(body.amount),
      currency: body.currency,
    };
  }

  private parseRefundPayload(body: Record<string, unknown>): VerifiedRefundWebhookEvent {
    const status = body.status;
    if (
      typeof body.eventId !== 'string' ||
      typeof body.providerRefundId !== 'string' ||
      typeof body.eventType !== 'string' ||
      typeof body.amount !== 'number' ||
      !Number.isInteger(body.amount) ||
      typeof body.currency !== 'string' ||
      (status !== 'SUCCEEDED' && status !== 'FAILED')
    ) {
      throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Majburiy maydon yetishmayapti yoki noto‘g‘ri tur (refund)');
    }
    return {
      kind: 'REFUND',
      providerEventId: body.eventId,
      providerRefundId: body.providerRefundId,
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
    // Timing-safe taqqoslash (bo'lim 17) — lekin avval uzunlik teng
    // bo'lishi shart (`timingSafeEqual` uzunlik mos kelmasa tashlaydi).
    return provided.length === expectedBuf.length && timingSafeEqual(provided, expectedBuf);
  }

  /** Test kodidan ham chaqiriladi — to'g'ri imzolangan webhook so'rovi yasash uchun. */
  signPayload(rawBody: Buffer): string {
    return createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
  }
}

export { SIGNATURE_HEADER as TEST_PROVIDER_SIGNATURE_HEADER };
