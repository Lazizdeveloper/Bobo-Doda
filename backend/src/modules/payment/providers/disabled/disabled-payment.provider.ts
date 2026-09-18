import { DomainError } from '@/common/errors/domain-error';
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  CreateRefundParams,
  CreateRefundResult,
  PaymentProvider,
  VerifiedProviderEvent,
  WebhookRequest,
} from '../payment-provider.interface';

/**
 * Bosqich 23 (production launch) — real Payme credential hali mavjud emas.
 * `PAYMENTS_ENABLED=false` bo'lsa `payment.module.ts` HAR DOIM shu klassni
 * ishlatadi — `PAYMENT_PROVIDER` qiymatidan (hatto `TEST`dan) qat'i nazar,
 * va `NODE_ENV`dan qat'i nazar (`DisabledPayoutProvider` bilan BIR XIL
 * naqsh — `providers/payout/disabled/disabled-payout.provider.ts`).
 *
 * Bu "soxta TEST fallback" EMAS: alohida, o'zining nomi bilan mavjud
 * bo'lgan holat. `PaymentController.create()` buni HECH QACHON chaqirmaydi
 * (feature flagni ALDINROQ tekshiradi, DB yozuvisiz — mavjud moliyaviy
 * tarix TEGILMAYDI), shuning uchun bu klassning metodlari amalda ISHGA
 * TUSHMAYDI — faqat himoya sifatida (agar kimdir kelajakda controller
 * tekshiruvini chetlab o'tsa, xato aniq va xavfsiz bo'lishi uchun).
 * `createPayment` ATAYLAB implement qilingan (interfeysda ixtiyoriy
 * bo'lsa ham) — aks holda `PaymentService.create()` `InvariantViolationError`
 * (500, "kutilmagan holat") tashlardi, `FEATURE_DISABLED` (503, aniq)
 * o'rniga.
 */
export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = 'DISABLED';

  createPayment(_params: CreatePaymentParams): Promise<CreatePaymentResult> {
    return Promise.reject(new DomainError('FEATURE_DISABLED', 'To‘lov qabul qilish hozircha o‘chirilgan'));
  }

  refundPayment(_params: CreateRefundParams): Promise<CreateRefundResult> {
    return Promise.reject(new DomainError('FEATURE_DISABLED', 'To‘lov qabul qilish hozircha o‘chirilgan'));
  }

  verifyWebhook(_req: WebhookRequest): VerifiedProviderEvent {
    throw new DomainError('FEATURE_DISABLED', 'To‘lov qabul qilish hozircha o‘chirilgan');
  }
}
