import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UnauthenticatedError } from '@/common/errors/domain-error';
import { TokenService } from '../token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AccessTokenPayload } from '../types/token-payload';

/**
 * GLOBAL guard (`APP_GUARD`, `app.module.ts`) — sukut bo'yicha HAR bir
 * marshrut autentifikatsiya talab qiladi ("fail closed"). Ochiq marshrutlar
 * `@Public()` bilan ANIQ belgilanadi (OTP so'rash/tasdiqlash, refresh,
 * health, staff — staff o'z alohida guard zanjiriga ega).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) {
      throw new UnauthenticatedError('Autentifikatsiya talab qilinadi', 'NO_SESSION');
    }

    req.user = this.tokens.verifyAccessToken(token);
    return true;
  }
}
