import { DomainError } from '@/common/errors/domain-error';
import type {
  CheckoutInitiationResult,
  CreatePaymentParams,
  CreateRefundParams,
  CreateRefundResult,
  PaymentProvider,
  VerifiedProviderEvent,
  WebhookRequest,
} from '../payment-provider.interface';
import { buildPaymeCheckoutUrl } from './payme-checkout-url.util';

export interface PaymeProviderConfig {
  merchantId: string;
  checkoutUrl: string;
}

/**
 * Bosqich 12, bo'lim 28 — `PaymentProvider` registry uchun. Payme protokoli
 * INBOUND (Payme → biz JSON-RPC, `PaymeMerchantController`/`PaymeMerchantService`
 * orqali) — shuning uchun bu klass FAQAT `buildCheckoutUrl` (sinxron,
 * tarmoq chaqiruvisiz) implement qiladi. `createPayment`/`queryPayment`/
 * `cancelPayment` — Payme'da mos OUTBOUND metod umuman yo'q, shuning uchun
 * ATAYLAB implement QILINMAGAN (interfeys ixtiyoriy, `PaymentService`/
 * `ReconciliationService` capability-tekshiruvi orqali gracefully o'tkazib
 * yuboradi — bo'lim 26/27: fake query endpoint yaratilmadi).
 */
export class PaymeProvider implements PaymentProvider {
  readonly name = 'PAYME';

  constructor(private readonly config: PaymeProviderConfig) {}

  buildCheckoutUrl(params: CreatePaymentParams): CheckoutInitiationResult {
    return {
      checkoutUrl: buildPaymeCheckoutUrl({
        checkoutBaseUrl: this.config.checkoutUrl,
        merchantId: this.config.merchantId,
        paymentId: params.paymentId,
        amountTiyin: params.amountTiyin,
      }),
    };
  }

  refundPayment(_params: CreateRefundParams): Promise<CreateRefundResult> {
    // Bo'lim 16/18 — rasmiy Payme Merchant API'da merchant-initiated
    // refund HTTP metodi YO'Q (faqat performed bo'lmagan transaksiya
    // uchun CancelTransaction — u INBOUND, Payme tomonidan chaqiriladi).
    // Shuning uchun bu yerda DETERMINISTIK rad — `RefundService.
    // callProviderAndAdvance()` buni allaqachon `PAYMENT_PROVIDER_ERROR`
    // sifatida to'g'ri qayta ishlaydi (Refund PENDING → FAILED, aniq
    // sabab bilan; hech qanday soxta funksionallik YOZILMAGAN).
    return Promise.reject(
      new DomainError(
        'PAYMENT_PROVIDER_ERROR',
        'Payme Merchant API merchant-initiated refund’ni qo‘llab-quvvatlamaydi — pre-settlement bekor qilish faqat foydalanuvchi/Payme orqali CancelTransaction bilan boshlanadi',
      ),
    );
  }

  verifyWebhook(_req: WebhookRequest): VerifiedProviderEvent {
    // Bo'lim 3 — Payme umumiy `POST /payments/webhooks/:provider` orqali
    // ISHLAMAYDI (`PaymeMerchantController` — dedicated route). Bu chaqiruv
    // amalda hech qachon sodir bo'lmasligi kerak (himoya sifatidagi o'lik yo'l).
    throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Payme bu route orqali ishlamaydi — POST /payments/payme ishlating');
  }
}
