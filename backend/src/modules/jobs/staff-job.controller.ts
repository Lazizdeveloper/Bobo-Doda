import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { CurrentStaff } from '@/modules/staff-auth/decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import type { Page } from '@/common/pagination/page-query.dto';
import { JobsService } from './jobs.service';
import { JobResponseDto, toJobResponseDto } from './dto/job-response.dto';

@Public()
@ApiBearerAuth()
@ApiTags('staff-jobs')
@Controller('staff/jobs')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('JOBS')
export class StaffJobController {
  constructor(
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<Page<JobResponseDto>> {
    const res = await this.jobs.listForStaff({
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 20,
      status,
      category,
      search,
    });
    return { ...res, items: res.items.map(toJobResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: JobResponseDto })
  async get(@Param('id') id: string): Promise<JobResponseDto> {
    const job = await this.jobs.getByIdOrThrow(id);
    return toJobResponseDto(job);
  }

  @Post(':id/close')
  @HttpCode(200)
  @ApiOkResponse({ type: JobResponseDto })
  async close(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<JobResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    const updated = await this.jobs.closeAsAdmin(id, reason || 'Admin qarori bilan yopildi', actor);
    return toJobResponseDto(updated);
  }
}
