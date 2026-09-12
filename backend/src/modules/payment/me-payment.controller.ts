import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import type { Page } from '@/common/pagination/page-query.dto';
import { PaymentService } from './payment.service';
import { PaymentResponseDto, toPaymentResponseDto } from './dto/payment-response.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

/** Buyer — o'z to'lovlari. O'qish HAR DOIM ochiq (`AccountStatusGuard` yo'q — Phase 4 me-contract naqshi bilan bir xil). */
@ApiBearerAuth()
@ApiTags('me-payments')
@Controller('me/payments')
@UseGuards(RolesGuard)
@Roles(Role.BUYER)
export class MePaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get()
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<Page<PaymentResponseDto>> {
    const page = await this.payments.listForBuyer(
      user.sub,
      query.page ?? 1,
      query.perPage ?? 20,
      query.status,
      query.contractId,
    );
    return { ...page, items: page.items.map(toPaymentResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: PaymentResponseDto })
  async get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<PaymentResponseDto> {
    return toPaymentResponseDto(await this.payments.getBuyerOwnedOrThrow(id, user.sub));
  }
}
