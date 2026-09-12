import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ServiceStatus } from '@prisma/client';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { CurrentStaff } from '@/modules/staff-auth/decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import { PageQueryDto } from '@/common/pagination/page-query.dto';
import { ServiceService } from './service.service';
import { ServiceResponseDto, toServiceResponseDto } from './dto/service-response.dto';
import { RejectServiceDto } from './dto/reject-service.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/** Staff moderatsiyasi — mavjud `SERVICES` huquqi. */
@Public()
@ApiBearerAuth()
@ApiTags('staff-services')
@Controller('staff/services')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('SERVICES')
export class StaffServiceController {
  constructor(
    private readonly services: ServiceService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @Query() query: PageQueryDto & { status?: ServiceStatus },
  ): Promise<Page<ServiceResponseDto>> {
    const page = await this.services.listForStaff(query.page ?? 1, query.perPage ?? 20, query.status);
    return { ...page, items: page.items.map(toServiceResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: ServiceResponseDto })
  async get(@Param('id') id: string): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.services.getByIdOrThrow(id));
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOkResponse({ type: ServiceResponseDto })
  async approve(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toServiceResponseDto(await this.services.approve(id, actor));
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOkResponse({ type: ServiceResponseDto })
  async reject(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: RejectServiceDto,
  ): Promise<ServiceResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toServiceResponseDto(await this.services.reject(id, dto.reason, actor));
  }
}
