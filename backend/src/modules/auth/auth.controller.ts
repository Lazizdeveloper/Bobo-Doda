import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppConfigService } from '@/config/app-config.service';
import { UnauthenticatedError } from '@/common/errors/domain-error';
import { AuthService, type AuthResult } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthSessionDto } from './dto/auth-session.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AccessTokenPayload } from './types/token-payload';
import { REFRESH_COOKIE_NAME, clearRefreshCookie, setRefreshCookie } from './cookie.util';
import type { RequestMeta } from './refresh-token.service';

function requestMeta(req: Request): RequestMeta {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

function toSessionDto(result: AuthResult): AuthSessionDto {
  return {
    accessToken: result.accessToken,
    activeRole: result.activeRole,
    roleChosen: result.roleChosen,
    profileDone: result.profileDone,
    isNewUser: result.isNewUser,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Har doim generic `{ sent: true }` qaytaradi — ro'yxatdan o'tgan/
   * o'tmagan telefon farqlanmaydi (enumeration himoyasi). Haqiqiy
   * xato FAQAT rate-limit (`RATE_LIMITED`) yoki noto'g'ri format bo'lsa chiqadi.
   * `dto.intent` — LOGIN yoki REGISTER (OTP yetkazish baribir SMS-only,
   * `intent` kanal EMAS).
   */
  @Public()
  @Post('otp/request')
  @HttpCode(200)
  async requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request): Promise<{ sent: true }> {
    await this.auth.requestOtp(dto.phone, dto.intent, req.ip);
    return { sent: true };
  }

  /**
   * Bosqich 20 — `dto.intent` LOGIN/REGISTER'ga qarab `AuthService.login`/
   * `register`ga tarqatiladi: LOGIN hech qachon User yaratmaydi
   * (`USER_NOT_FOUND`), REGISTER hech qachon mavjud hisobga tegmaydi
   * (`PHONE_EXISTS`) — ikkalasi ham faqat VALID OTP'dan keyin oshkor
   * bo'ladi.
   */
  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthSessionDto })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    const result =
      dto.intent === 'REGISTER'
        ? await this.auth.register(dto.phone, dto.code, requestMeta(req))
        : await this.auth.login(dto.phone, dto.code, requestMeta(req));
    this.setCookie(res, result.refreshToken);
    return toSessionDto(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthSessionDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!raw) throw new UnauthenticatedError('Sessiya topilmadi', 'NO_SESSION');
    const result = await this.auth.refresh(raw, requestMeta(req));
    this.setCookie(res, result.refreshToken);
    return toSessionDto(result);
  }

  /** Joriy qurilma/sessiyadan chiqish. Boshqa sessiyalarga tegmaydi. */
  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (raw) await this.auth.logout(raw, user.sub);
    clearRefreshCookie(res, this.config.isProduction);
    return { ok: true };
  }

  private setCookie(res: Response, refreshToken: string): void {
    setRefreshCookie(res, refreshToken, this.config.jwt.refreshTtl, this.config.isProduction);
  }
}
