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
import { StaffUserService } from './staff-user.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserDetailResponseDto, UserResponseDto, toUserResponseDto } from './dto/user-response.dto';

/** `USERS` huquqi (mavjud `StaffPermission`). To'liq foydalanuvchi boshqaruvi — Bosqich 11. */
@Public()
@ApiBearerAuth()
@ApiTags('staff-users')
@Controller('staff/users')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('USERS')
export class StaffUserController {
  constructor(
    private readonly staffUsers: StaffUserService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<Page<UserResponseDto>> {
    const page = await this.staffUsers.listForStaff(
      {
        status: query.status,
        sellerStatus: query.sellerStatus,
        role: query.role,
        phone: query.phone,
        createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
        createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toUserResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: UserDetailResponseDto })
  async get(@Param('id') id: string): Promise<UserDetailResponseDto> {
    const detail = await this.staffUsers.getDetailByIdOrThrow(id);
    return {
      ...toUserResponseDto(detail),
      contractsAsBuyerCount: detail.contractsAsBuyerCount,
      contractsAsSellerCount: detail.contractsAsSellerCount,
      paymentsCount: detail.paymentsCount,
    };
  }

  @Post(':id/suspend')
  @HttpCode(200)
  async suspend(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ): Promise<{ ok: true }> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    await this.staffUsers.suspend(id, dto.reason, dto.suspendedUntil, actor);
    return { ok: true };
  }

  @Post(':id/block')
  @HttpCode(200)
  async block(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
  ): Promise<{ ok: true }> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    await this.staffUsers.block(id, dto.reason, actor);
    return { ok: true };
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  async reactivate(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    await this.staffUsers.reactivate(id, actor);
    return { ok: true };
  }
}
