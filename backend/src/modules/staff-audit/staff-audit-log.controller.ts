import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { AuditService } from '@/common/audit/audit.service';
import type { Page } from '@/common/pagination/page-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogResponseDto, toAuditLogResponseDto } from './dto/audit-log-response.dto';

/**
 * Bo'lim 36 — `AUDIT` huquqi (mavjud, ilgari ishlatilmagan `StaffPermission`).
 * FAQAT o'qish — `AuditService.record()` YAGONA yozish yo'li bo'lib qoladi
 * (bu controller HECH QANDAY mutatsiya taklif qilmaydi, append-only
 * invariant buzilmaydi).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-audit-logs')
@Controller('staff/audit-logs')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('AUDIT')
export class StaffAuditLogController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Query() query: ListAuditLogsQueryDto): Promise<Page<AuditLogResponseDto>> {
    const page = await this.audit.list(
      {
        actorType: query.actorType,
        actorId: query.actorId,
        action: query.action,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        requestId: query.requestId,
        createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
        createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toAuditLogResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: AuditLogResponseDto })
  async get(@Param('id') id: string): Promise<AuditLogResponseDto> {
    return toAuditLogResponseDto(await this.audit.getByIdOrThrow(id));
  }
}
