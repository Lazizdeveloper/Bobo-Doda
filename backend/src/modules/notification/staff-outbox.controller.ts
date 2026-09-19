import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { CurrentStaff } from '@/modules/staff-auth/decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import type { Page } from '@/common/pagination/page-query.dto';
import { OutboxWorkerService } from './outbox-worker.service';
import { ListOutboxQueryDto } from './dto/list-outbox-query.dto';
import { OutboxEventResponseDto, OutboxEventDetailResponseDto, toOutboxEventResponseDto, toOutboxEventDetailResponseDto } from './dto/outbox-response.dto';
import { OutboxSummaryResponseDto } from './dto/outbox-summary-response.dto';

/**
 * Bo'lim 27/28/29 — `SETTINGS` huquqi qayta ishlatiladi (operatsion/tizim
 * infratuzilmasi — Reconciliation'ning `PAYMENTS`dan farqli, bu yerda
 * moliyaviy EMAS, barcha domenlarga tegishli hodisalar bor). Staff HECH
 * QACHON statusni to'g'ridan-to'g'ri "SUCCEEDED" qila olmaydi (bo'lim 29)
 * — faqat `retry` (qayta claim/deliver siklidan o'tkazish).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-outbox')
@Controller('staff/outbox')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('SETTINGS')
export class StaffOutboxController {
  constructor(
    private readonly outbox: OutboxWorkerService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListOutboxQueryDto): Promise<Page<OutboxEventResponseDto>> {
    const page = await this.outbox.listForStaff(
      { status: query.status, eventType: query.eventType, aggregateType: query.aggregateType },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toOutboxEventResponseDto) };
  }

  @Get('summary')
  async summary(): Promise<OutboxSummaryResponseDto> {
    return this.outbox.summary();
  }

  @Get(':id')
  @ApiOkResponse({ type: OutboxEventDetailResponseDto })
  async get(@Param('id') id: string): Promise<OutboxEventDetailResponseDto> {
    return toOutboxEventDetailResponseDto(await this.outbox.getByIdOrThrow(id));
  }

  @Post(':id/retry')
  @HttpCode(200)
  @ApiOkResponse({ type: OutboxEventResponseDto })
  async retry(@CurrentStaff() staff: StaffAccessTokenPayload, @Param('id') id: string): Promise<OutboxEventResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toOutboxEventResponseDto(await this.outbox.retry(id, actor));
  }
}
