import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { CurrentStaff } from '@/modules/staff-auth/decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import { PageQueryDto } from '@/common/pagination/page-query.dto';
import { SellerApplicationService } from './seller-application.service';
import {
  SellerApplicationResponseDto,
  toSellerApplicationResponseDto,
} from './dto/seller-application-response.dto';
import { RejectSellerApplicationDto } from './dto/reject-seller-application.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/**
 * Staff moderatsiyasi — `KYC` huquqi (mavjud `StaffPermission`, Phase 2'dagi
 * "granular emas, mavjud sahifa-darajali huquq" qaroriga mos).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-seller-applications')
@Controller('staff/seller-applications')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('KYC')
export class StaffSellerApplicationController {
  constructor(
    private readonly applications: SellerApplicationService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @Query() query: PageQueryDto & { status?: 'PENDING' | 'APPROVED' | 'REJECTED' },
  ): Promise<Page<SellerApplicationResponseDto>> {
    const page = await this.applications.listForStaff(query.page ?? 1, query.perPage ?? 20, query.status);
    return { ...page, items: page.items.map(toSellerApplicationResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: SellerApplicationResponseDto })
  async get(@Param('id') id: string): Promise<SellerApplicationResponseDto> {
    return toSellerApplicationResponseDto(await this.applications.getByIdOrThrow(id));
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOkResponse({ type: SellerApplicationResponseDto })
  async approve(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
  ): Promise<SellerApplicationResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toSellerApplicationResponseDto(await this.applications.approve(id, actor));
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOkResponse({ type: SellerApplicationResponseDto })
  async reject(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: RejectSellerApplicationDto,
  ): Promise<SellerApplicationResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toSellerApplicationResponseDto(await this.applications.reject(id, dto.reason, actor));
  }
}
