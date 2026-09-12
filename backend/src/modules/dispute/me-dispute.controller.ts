import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import type { Page } from '@/common/pagination/page-query.dto';
import { DisputeService } from './dispute.service';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { DisputeResponseDto, toDisputeResponseDto } from './dto/dispute-response.dto';
import { DisputeEvidenceResponseDto, toDisputeEvidenceResponseDto } from './dto/dispute-evidence-response.dto';
import { DisputeEventResponseDto, toDisputeEventResponseDto } from './dto/dispute-event-response.dto';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';

/**
 * Bo'lim 44 — HAR IKKALA ishtirokchi (buyer/seller) bitta umumiy `/me/disputes`
 * ostida (Refund/Payment'dan farqli — u yerlarda rol bitta tomonga xos edi).
 * Yaratish BU YERDA YO'Q — `OpenDisputeController` (`/me/contracts/:id/disputes`).
 */
@ApiBearerAuth()
@ApiTags('me-disputes')
@Controller('me/disputes')
@UseGuards(RolesGuard)
@Roles(Role.BUYER, Role.SELLER)
export class MeDisputeController {
  constructor(
    private readonly disputes: DisputeService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListDisputesQueryDto,
  ): Promise<Page<DisputeResponseDto>> {
    const page = await this.disputes.listForParticipant(user.sub, query.page ?? 1, query.perPage ?? 20, query.status);
    return { ...page, items: page.items.map(toDisputeResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: DisputeResponseDto })
  async get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<DisputeResponseDto> {
    return toDisputeResponseDto(await this.disputes.getParticipantOwnedOrThrow(id, user.sub));
  }

  @Get(':id/evidence')
  async listEvidence(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<DisputeEvidenceResponseDto[]> {
    await this.disputes.getParticipantOwnedOrThrow(id, user.sub);
    return (await this.disputes.listEvidence(id)).map(toDisputeEvidenceResponseDto);
  }

  @Post(':id/evidence')
  @HttpCode(200)
  @ApiOkResponse({ type: DisputeEvidenceResponseDto })
  async addEvidence(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: AddEvidenceDto,
  ): Promise<DisputeEvidenceResponseDto> {
    await this.disputes.getParticipantOwnedOrThrow(id, user.sub);
    const actor = await this.audit.resolveUserActor(user.sub);
    const evidence = await this.disputes.addEvidence(id, dto, { userId: user.sub }, actor);
    return toDisputeEvidenceResponseDto(evidence);
  }

  @Get(':id/events')
  async listEvents(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<DisputeEventResponseDto[]> {
    await this.disputes.getParticipantOwnedOrThrow(id, user.sub);
    return (await this.disputes.listEvents(id)).map(toDisputeEventResponseDto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOkResponse({ type: DisputeResponseDto })
  async cancel(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<DisputeResponseDto> {
    const actor = await this.audit.resolveUserActor(user.sub);
    const dispute = await this.disputes.cancel(id, user.sub, actor);
    return toDisputeResponseDto(dispute);
  }
}
