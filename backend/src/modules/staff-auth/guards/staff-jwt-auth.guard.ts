import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UnauthenticatedError } from '@/common/errors/domain-error';
import { TokenService } from '@/modules/auth/token.service';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';

/**
 * Staff route'lari GLOBAL guard zanjirida YO'Q (`app.module.ts`dagi
 * `JwtAuthGuard` marketplace uchun) — har staff controller ANIQ
 * `@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)` qo'yadi. Bu ikki
 * auth tizimini modul darajasida ham ajratib turadi (ADR-04).
 */
@Injectable()
export class StaffJwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { staff?: StaffAccessTokenPayload }>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) {
      throw new UnauthenticatedError('Autentifikatsiya talab qilinadi', 'NO_SESSION');
    }
    req.staff = this.tokens.verifyStaffAccessToken(token);
    return true;
  }
}
