import { Controller, HttpCode, Inject, Param, Post, Req, type RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { DomainError } from '@/common/errors/domain-error';
import { PAYOUT_PROVIDER, type PayoutProvider } from './providers/payout-provider.interface';
import { PayoutService } from './payout.service';

/**
 * Bo'lim 28 — Payment/Refund'dan ALOHIDA route/provider (`PaymentWebhookController`
 * bilan BIR XIL naqsh, lekin mustaqil). Provider-kalit + imzo tekshiruvi
 * shu yerda (`PayoutService` faqat allaqachon VERIFIKATSIYA qilingan
 * hodisani oladi — Payment/Refund bilan bir xil ajratish qoidasi).
 */
@Public()
@ApiExcludeController()
@Controller('payouts/webhooks')
export class PayoutWebhookController {
  constructor(
    private readonly payouts: PayoutService,
    @Inject(PAYOUT_PROVIDER) private readonly provider: PayoutProvider,
  ) {}

  @Post(':provider')
  @HttpCode(200)
  async handle(
    @Param('provider') providerKey: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: true }> {
    if (providerKey !== this.provider.name) {
      throw new DomainError('PAYOUT_WEBHOOK_INVALID', 'Noma’lum provider');
    }
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const event = this.provider.verifyWebhook({ rawBody, headers: req.headers });
    await this.payouts.handleWebhookEvent(event);
    return { received: true };
  }
}
