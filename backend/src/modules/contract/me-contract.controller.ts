import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AccountStatusGuard } from '@/common/guards/account-status.guard';
import { AuditService } from '@/common/audit/audit.service';
import { ContractService } from './contract.service';
import { ContractResponseDto, toContractResponseDto } from './dto/contract-response.dto';
import { MilestoneResponseDto, toMilestoneResponseDto } from './dto/milestone-response.dto';
import { RequestRevisionDto } from './dto/request-revision.dto';
import { ListContractsQueryDto } from './dto/list-contracts-query.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/**
 * Buyer — o'z shartnomalari. `AccountStatusGuard` FAQAT yozish
 * metodlarida (`cancel`/`approve`/`request-revision`) — o'qish HAR DOIM
 * ochiq (bloklangan/cheklangan foydalanuvchi ham o'z tarixini ko'rishi
 * kerak — `AccountStatusGuard`ning o'z hujjatidagi qoida).
 */
@ApiBearerAuth()
@ApiTags('me-contracts')
@Controller('me/contracts')
@UseGuards(RolesGuard)
@Roles(Role.BUYER)
export class MeContractController {
  constructor(
    private readonly contracts: ContractService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListContractsQueryDto,
  ): Promise<Page<ContractResponseDto>> {
    const page = await this.contracts.listForBuyer(user.sub, query.page ?? 1, query.perPage ?? 20, query.status);
    return { ...page, items: page.items.map(toContractResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: ContractResponseDto })
  async get(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ContractResponseDto> {
    return toContractResponseDto(await this.contracts.getBuyerOwnedOrThrow(id, user.sub));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: ContractResponseDto })
  async cancel(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ContractResponseDto> {
    const actor = await this.audit.resolveUserActor(user.sub);
    return toContractResponseDto(await this.contracts.cancel(id, user.sub, actor));
  }

  @Post(':contractId/milestones/:milestoneId/approve')
  @HttpCode(200)
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: MilestoneResponseDto })
  async approveMilestone(
    @CurrentUser() user: AccessTokenPayload,
    @Param('contractId') contractId: string,
    @Param('milestoneId') milestoneId: string,
  ): Promise<MilestoneResponseDto> {
    const actor = await this.audit.resolveUserActor(user.sub);
    const milestone = await this.contracts.approveMilestone(contractId, milestoneId, user.sub, actor);
    return toMilestoneResponseDto(milestone);
  }

  @Post(':contractId/milestones/:milestoneId/request-revision')
  @HttpCode(200)
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: MilestoneResponseDto })
  async requestRevision(
    @CurrentUser() user: AccessTokenPayload,
    @Param('contractId') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: RequestRevisionDto,
  ): Promise<MilestoneResponseDto> {
    const actor = await this.audit.resolveUserActor(user.sub);
    const milestone = await this.contracts.requestRevision(contractId, milestoneId, user.sub, dto, actor);
    return toMilestoneResponseDto(milestone);
  }
}
