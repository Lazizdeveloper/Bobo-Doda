import { Controller, HttpCode, Inject, Param, Post, Req, type RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { DomainError } from '@/common/errors/domain-error';
import { PAYMENT_PROVIDER, type PaymentProvider } from '@/modules/payment/providers/payment-provider.interface';
import { PaymentService } from '@/modules/payment/payment.service';
import { RefundService } from './refund.service';

/**
 * Bo'lim 4/15 — public provider callback (`@Public()`). **`@Public()` ≠
 * unverified** — imzo `PaymentProvider.verifyWebhook()` ichida tekshiriladi
 * (ADR-03: yaroqsiz imzo → 401, hech narsa yozilmaydi).
 *
 * Bosqich 7'dan boshlab BITTA route Payment VA Refund hodisalarini ham
 * qabul qiladi (Refund — Payment bilan BIR XIL merchant-provider
 * munosabati, bo'lim 4) — `verifyWebhook()` natijasidagi `kind`
 * diskriminatoriga qarab tegishli servisga dispatch qilinadi. Bu fayl
 * `payment/` papkasidan `refund/`ga KO'CHIRILGAN (`PaymentModule`↔
 * `RefundModule` orasida circular import yaratmaslik uchun —
 * `refund.module.ts`dagi izohga qarang).
 *
 * Payout — ALOHIDA route/provider (bo'lim 28, `PayoutWebhookController`).
 */
@Public()
@ApiExcludeController()
@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly payments: PaymentService,
    private readonly refunds: RefundService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  @Post(':provider')
  @HttpCode(200)
  async handle(
    @Param('provider') providerKey: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: true }> {
    if (providerKey !== this.provider.name) {
      throw new DomainError('PAYMENT_WEBHOOK_INVALID', 'Noma’lum provider');
    }
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const event = this.provider.verifyWebhook({ rawBody, headers: req.headers });

    if (event.kind === 'REFUND') {
      await this.refunds.handleWebhookEvent(event);
    } else {
      await this.payments.handlePaymentEvent(event);
    }
    return { received: true };
  }
}
