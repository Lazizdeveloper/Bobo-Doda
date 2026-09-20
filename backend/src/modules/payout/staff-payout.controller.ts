import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import type { Page } from '@/common/pagination/page-query.dto';
import { PayoutService } from './payout.service';
import { StaffPayoutResponseDto, toStaffPayoutResponseDto } from './dto/payout-response.dto';
import { StaffListPayoutsQueryDto } from './dto/list-payouts-query.dto';

/**
 * Staff — FAQAT o'qish (Payment/Refund bilan bir xil qoida — bo'lim 33/60:
 * manual financial adjustment yo'q). Mavjud `PAYMENTS` huquqi qayta
 * ishlatiladi — yangi `PAYOUTS` permission qo'shilmadi (bo'lim 66).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-payouts')
@Controller('staff/payouts')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('PAYMENTS')
export class StaffPayoutController {
  constructor(private readonly payouts: PayoutService) {}

  @Get()
  async list(@Query() query: StaffListPayoutsQueryDto): Promise<Page<StaffPayoutResponseDto>> {
    const page = await this.payouts.listForStaff(
      { status: query.status, sellerId: query.sellerId },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toStaffPayoutResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: StaffPayoutResponseDto })
  async get(@Param('id') id: string): Promise<StaffPayoutResponseDto> {
    return toStaffPayoutResponseDto(await this.payouts.getByIdOrThrow(id));
  }
}
