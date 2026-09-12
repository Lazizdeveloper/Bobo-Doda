import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import type { Page } from '@/common/pagination/page-query.dto';
import { PaymentService } from './payment.service';
import { StaffPaymentResponseDto, toStaffPaymentResponseDto } from './dto/payment-response.dto';
import { StaffListPaymentsQueryDto } from './dto/list-payments-query.dto';

/**
 * Staff — FAQAT o'qish (bo'lim 33: "Staff Phase 5'da payment status'ni
 * qo'lda o'zgartira olmasin — manual financial adjustment kelajakdagi
 * controlled flow"). Mavjud `PAYMENTS` huquqi qayta ishlatiladi (Bosqich
 * 1'dan bor, hali ishlatilmagan edi) — yangi permission qo'shilmadi.
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-payments')
@Controller('staff/payments')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('PAYMENTS')
export class StaffPaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get()
  async list(@Query() query: StaffListPaymentsQueryDto): Promise<Page<StaffPaymentResponseDto>> {
    const page = await this.payments.listForStaff(
      { status: query.status, contractId: query.contractId, payerUserId: query.payerUserId, provider: query.provider },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toStaffPaymentResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: StaffPaymentResponseDto })
  async get(@Param('id') id: string): Promise<StaffPaymentResponseDto> {
    return toStaffPaymentResponseDto(await this.payments.getByIdOrThrow(id));
  }
}
