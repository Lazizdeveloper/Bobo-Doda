import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AccountStatusGuard } from '@/common/guards/account-status.guard';
import { SellerEligibilityGuard } from '@/common/guards/seller-eligibility.guard';
import { AuditService } from '@/common/audit/audit.service';
import { ContractService } from './contract.service';
import { ContractResponseDto, toContractResponseDto } from './dto/contract-response.dto';
import { MilestoneResponseDto, toMilestoneResponseDto } from './dto/milestone-response.dto';
import { SubmitMilestoneDto } from './dto/submit-milestone.dto';
import { ListContractsQueryDto } from './dto/list-contracts-query.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/**
 * Seller — o'z shartnomalari. `accept`/`submit` QO'SHIMCHA
 * `SellerEligibilityGuard` talab qiladi (bo'lim 25: "seller keyin
 * SUSPENDED qilinsa yangi contract accept/submit qila olmasin" — LIVE
 * tekshiruv, `reject`da EMAS — rad etish sotuvchi huquqini talab
 * qilmaydi, aksincha undan voz kechish).
 */
@ApiBearerAuth()
@ApiTags('seller-contracts')
@Controller('seller/contracts')
@UseGuards(RolesGuard)
@Roles(Role.SELLER)
export class SellerContractController {
  constructor(
    private readonly contracts: ContractService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListContractsQueryDto,
  ): Promise<Page<ContractResponseDto>> {
    const page = await this.contracts.listForSeller(user.sub, query.page ?? 1, query.perPage ?? 20, query.status);
    return { ...page, items: page.items.map(toContractResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: ContractResponseDto })
  async get(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ContractResponseDto> {
    return toContractResponseDto(await this.contracts.getSellerOwnedOrThrow(id, user.sub));
  }

  @Post(':id/accept')
  @HttpCode(200)
  @UseGuards(AccountStatusGuard, SellerEligibilityGuard)
  @ApiOkResponse({ type: ContractResponseDto })
  async accept(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ContractResponseDto> {
    const actor = await this.audit.resolveUserActor(user.sub);
    return toContractResponseDto(await this.contracts.accept(id, user.sub, actor));
  }

  @Post(':id/reject')
  @HttpCode(200)
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: ContractResponseDto })
  async reject(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ContractResponseDto> {
    const actor = await this.audit.resolveUserActor(user.sub);
    return toContractResponseDto(await this.contracts.reject(id, user.sub, actor));
  }

  @Post(':contractId/milestones/:milestoneId/submit')
  @HttpCode(200)
  @UseGuards(AccountStatusGuard, SellerEligibilityGuard)
  @ApiOkResponse({ type: MilestoneResponseDto })
  async submitMilestone(
    @CurrentUser() user: AccessTokenPayload,
    @Param('contractId') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: SubmitMilestoneDto,
  ): Promise<MilestoneResponseDto> {
    const actor = await this.audit.resolveUserActor(user.sub);
    const milestone = await this.contracts.submitMilestone(contractId, milestoneId, user.sub, dto, actor);
    return toMilestoneResponseDto(milestone);
  }
}
