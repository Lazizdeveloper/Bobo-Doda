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
import { SellerApplicationService } from './seller-application.service';
import { SuspendSellerDto } from './dto/suspend-seller.dto';
import { ListSellersQueryDto } from './dto/list-sellers-query.dto';
import { SellerDetailResponseDto, SellerListItemResponseDto } from './dto/seller-admin-response.dto';

/**
 * Ariza ORQALI EMAS — staff to'g'ridan-to'g'ri `sellerStatus`ni boshqaradi
 * (`APPROVED ⇄ SUSPENDED`). Alohida controller (`/staff/sellers/*`, ariza
 * `/staff/seller-applications/*`dan farqli) — nishon USER, ARIZA emas.
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-sellers')
@Controller('staff/sellers')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('KYC')
export class StaffSellerController {
  constructor(
    private readonly applications: SellerApplicationService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListSellersQueryDto): Promise<Page<SellerListItemResponseDto>> {
    return this.applications.listSellersForStaff({ sellerStatus: query.sellerStatus }, query.page ?? 1, query.perPage ?? 20);
  }

  @Get(':userId')
  @ApiOkResponse({ type: SellerDetailResponseDto })
  async get(@Param('userId') userId: string): Promise<SellerDetailResponseDto> {
    return this.applications.getSellerDetailByIdOrThrow(userId);
  }

  @Post(':userId/suspend')
  @HttpCode(200)
  async suspend(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('userId') userId: string,
    @Body() dto: SuspendSellerDto,
  ): Promise<{ ok: true }> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    await this.applications.suspendSeller(userId, dto.reason, actor);
    return { ok: true };
  }

  @Post(':userId/reinstate')
  @HttpCode(200)
  async reinstate(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('userId') userId: string,
  ): Promise<{ ok: true }> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    await this.applications.reinstateSeller(userId, actor);
    return { ok: true };
  }
}
