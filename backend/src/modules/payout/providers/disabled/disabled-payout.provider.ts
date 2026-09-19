import { DomainError } from '@/common/errors/domain-error';
import type {
  CreatePayoutParams,
  CreatePayoutResult,
  PayoutProvider,
  PayoutWebhookRequest,
  VerifiedPayoutWebhookEvent,
} from '../payout-provider.interface';

/**
 * Bosqich 13, bo'lim 48 — real payout rail hali rasmiy tanlanmagan
 * (bo'lim 13/14: arbitrary provider o'ylab topilmaydi). `PAYOUTS_ENABLED=false`
 * bo'lsa `payout.module.ts` HAR DOIM shu klassni ishlatadi — `PAYOUT_PROVIDER`
 * qiymatidan (hatto `TEST`dan) qat'i nazar, va `NODE_ENV`dan qat'i nazar.
 *
 * Bu "soxta TEST fallback" EMAS (bo'lim 48's ochiq taqig'i) — alohida,
 * o'zining nomi bilan mavjud bo'lgan holat: `SellerPayoutController.create()`
 * buni HECH QACHON chaqirmaydi (feature flag'ni ALDINROQ tekshiradi, DB
 * yozuvisiz — bo'lim 48 "existing accounting untouched"), shuning uchun bu
 * klassning metodlari amalda ISHGA TUSHMAYDI — faqat himoya sifatida (agar
 * kimdir kelajakda controller tekshiruvini chetlab o'tsa, xato aniq va
 * xavfsiz bo'lishi uchun).
 */
export class DisabledPayoutProvider implements PayoutProvider {
  readonly name = 'DISABLED';

  createPayout(_params: CreatePayoutParams): Promise<CreatePayoutResult> {
    return Promise.reject(new DomainError('FEATURE_DISABLED', 'Pul yechish (payout) hozircha o‘chirilgan'));
  }

  verifyWebhook(_req: PayoutWebhookRequest): VerifiedPayoutWebhookEvent {
    throw new DomainError('FEATURE_DISABLED', 'Pul yechish (payout) hozircha o‘chirilgan');
  }
}
