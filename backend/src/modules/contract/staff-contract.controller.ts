import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { ContractService } from './contract.service';
import { ContractResponseDto, toContractResponseDto } from './dto/contract-response.dto';
import { StaffListContractsQueryDto } from './dto/list-contracts-query.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/**
 * Staff — FAQAT o'qish (bo'lim 21: "staff bu Phase'da contract status'ni
 * qo'lda o'zgartirmasin — manual override keyinchalik audit/dispute/admin
 * bosqichida"). Mavjud `ORDERS` huquqi qayta ishlatiladi (aynan shu
 * maqsad uchun Bosqich 1'dan bor, hali ishlatilmagan edi).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-contracts')
@Controller('staff/contracts')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('ORDERS')
export class StaffContractController {
  constructor(private readonly contracts: ContractService) {}

  @Get()
  async list(@Query() query: StaffListContractsQueryDto): Promise<Page<ContractResponseDto>> {
    const page = await this.contracts.listForStaff(
      { status: query.status, buyerId: query.buyerId, sellerId: query.sellerId, serviceId: query.serviceId },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toContractResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: ContractResponseDto })
  async get(@Param('id') id: string): Promise<ContractResponseDto> {
    return toContractResponseDto(await this.contracts.getByIdOrThrow(id));
  }
}
