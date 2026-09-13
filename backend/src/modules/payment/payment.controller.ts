import { Controller, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AccountStatusGuard } from '@/common/guards/account-status.guard';
import { AuditService } from '@/common/audit/audit.service';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { DomainError } from '@/common/errors/domain-error';
import { PaymentService } from './payment.service';
import { PaymentResponseDto, toPaymentResponseDto } from './dto/payment-response.dto';
import { CREATE_PAYMENT_ENDPOINT, PAYMENT_CREATE_STALE_AFTER_MS } from './payment.constants';

/**
 * Yaratish — bo'lim 8/50: `POST /me/contracts/:contractId/payment`. Body
 * YO'Q (bo'lim 9: "amount body'dan umuman olinmasin" — summani HAR DOIM
 * `Contract.agreedAmount` snapshot'idan oladi). `Idempotency-Key` MAJBURIY
 * (Phase 4'dagi Contract yaratishdan farqli — u yerda ixtiyoriy edi: bu
 * yerda moliyaviy tashqi effekt bor, tarmoq retry provider'ni ikki marta
 * chaqirmasligi SHART).
 */
@ApiBearerAuth()
@ApiTags('me-payments')
@Controller('me/contracts/:contractId/payment')
@UseGuards(RolesGuard, AccountStatusGuard)
@Roles(Role.BUYER)
export class PaymentController {
  constructor(
    private readonly payments: PaymentService,
    private readonly idempotency: IdempotencyService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ type: PaymentResponseDto })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Param('contractId') contractId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<PaymentResponseDto> {
    if (!idempotencyKey) {
      throw new DomainError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header majburiy');
    }
    const actor = await this.audit.resolveUserActor(user.sub);
    const { body } = await this.idempotency.run(
      {
        key: idempotencyKey,
        userId: user.sub,
        endpoint: CREATE_PAYMENT_ENDPOINT,
        requestPayload: { contractId },
        staleAfterMs: PAYMENT_CREATE_STALE_AFTER_MS,
      },
      async () => {
        const { payment, checkoutUrl } = await this.payments.create(contractId, user.sub, actor);
        return { statusCode: 200, body: toPaymentResponseDto(payment, checkoutUrl) };
      },
    );
    return body;
  }
}
