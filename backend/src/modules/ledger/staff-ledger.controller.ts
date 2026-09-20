import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import type { Page } from '@/common/pagination/page-query.dto';
import { LedgerService } from './ledger.service';
import { LedgerTransactionResponseDto, toLedgerTransactionResponseDto } from './dto/ledger-transaction-response.dto';
import { ListLedgerTransactionsQueryDto } from './dto/list-ledger-transactions-query.dto';

/**
 * Staff — FAQAT o'qish (bo'lim 32/33: "staff qo'lda entry kirita olmasin,
 * mutate yo'q"). Mavjud `PAYMENTS` huquqi qayta ishlatildi (Phase 5 bilan
 * bir xil qaror — yangi permission qo'shilmadi).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-ledger')
@Controller('staff/ledger/transactions')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('PAYMENTS')
export class StaffLedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  async list(@Query() query: ListLedgerTransactionsQueryDto): Promise<Page<LedgerTransactionResponseDto>> {
    const page = await this.ledger.listTransactionsForStaff(
      { type: query.type, sourceId: query.sourceId },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toLedgerTransactionResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: LedgerTransactionResponseDto })
  async get(@Param('id') id: string): Promise<LedgerTransactionResponseDto> {
    return toLedgerTransactionResponseDto(await this.ledger.getTransactionForStaffOrThrow(id));
  }
}
