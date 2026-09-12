import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { CurrentStaff } from '@/modules/staff-auth/decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import { StaffUserService } from './staff-user.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { BlockUserDto } from './dto/block-user.dto';

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
