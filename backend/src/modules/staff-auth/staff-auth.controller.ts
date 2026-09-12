import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppConfigService } from '@/config/app-config.service';
import { UnauthenticatedError } from '@/common/errors/domain-error';
import { StaffAuthService } from './staff-auth.service';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffMeDto, StaffSessionDto } from './dto/staff-session.dto';
import { StaffJwtAuthGuard } from './guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from './guards/staff-permission.guard';
import { CurrentStaff } from './decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import {
  STAFF_REFRESH_COOKIE_NAME,
  clearStaffRefreshCookie,
  setStaffRefreshCookie,
} from './cookie.util';
import type { StaffMember } from '@prisma/client';
import { Public } from '@/modules/auth/decorators/public.decorator';

function toSessionDto(accessToken: string, staff: StaffMember): StaffSessionDto {
  return { accessToken, role: staff.role, permissions: staff.permissions };
}

/**
 * `@Public()` — GLOBAL marketplace `JwtAuthGuard`ni chetlab o'tadi (bu
 * controller marketplace token'iga UMUMAN ishonmaydi). `logout` esa
 * o'zining `StaffJwtAuthGuard`iga ega — ikkalasi mustaqil: "marketplace
 * autentifikatsiyasi shart emas" != "hech qanday autentifikatsiya shart
 * emas".
 */
@Public()
@ApiTags('staff-auth')
@Controller('staff/auth')
export class StaffAuthController {
  constructor(
    private readonly staffAuth: StaffAuthService,
    private readonly config: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: StaffSessionDto })
  async login(
    @Body() dto: StaffLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StaffSessionDto> {
    const result = await this.staffAuth.login(dto.email, dto.password, dto.totpCode, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setCookie(res, result.refreshToken);
    return toSessionDto(result.accessToken, result.staff);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: StaffSessionDto })
  async refresh(@Req() req: Request): Promise<StaffSessionDto> {
    const raw = req.cookies?.[STAFF_REFRESH_COOKIE_NAME] as string | undefined;
    if (!raw) throw new UnauthenticatedError('Sessiya topilmadi', 'NO_SESSION');
    const result = await this.staffAuth.refresh(raw);
    return toSessionDto(result.accessToken, result.staff);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(StaffJwtAuthGuard)
  async logout(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const raw = req.cookies?.[STAFF_REFRESH_COOKIE_NAME] as string | undefined;
    if (raw) await this.staffAuth.logout(raw, staff.sub);
    clearStaffRefreshCookie(res, this.config.isProduction);
    return { ok: true };
  }

  private setCookie(res: Response, refreshToken: string): void {
    setStaffRefreshCookie(res, refreshToken, this.config.staffJwt.refreshTtl, this.config.isProduction);
  }
}

@Public()
@ApiTags('staff-auth')
@ApiBearerAuth()
@Controller('staff/me')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
export class StaffMeController {
  constructor(private readonly staffAuth: StaffAuthService) {}

  @Get()
  @ApiOkResponse({ type: StaffMeDto })
  async getMe(@CurrentStaff() staff: StaffAccessTokenPayload): Promise<StaffMeDto> {
    const member = await this.staffAuth.getById(staff.sub);
    return {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      title: member.title,
      permissions: member.permissions,
      mfaEnabled: member.mfaEnabled,
    };
  }
}
