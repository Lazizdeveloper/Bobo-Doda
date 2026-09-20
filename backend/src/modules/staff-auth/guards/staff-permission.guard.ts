import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { StaffPermission, StaffRole } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { DomainError, ForbiddenError, UnauthenticatedError } from '@/common/errors/domain-error';
import {
  ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY,
  STAFF_PERMISSION_KEY,
  STAFF_ROLE_KEY,
} from '../decorators/require-permission.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';

/**
 * `StaffJwtAuthGuard`DAN KEYIN ishlaydi (`@UseGuards` tartibida ikkinchi).
 * HAR staff so'rovda LIVE tekshiradi (`@RequirePermission()` yo'q bo'lsa
 * ham) — chunki bu YERDA staff hisobi/sessiyasi HALI ham amal qiladimi
 * tekshiruvi ham bor, faqat ruxsat emas:
 *
 *  1. `StaffMember.status === 'ACTIVE'` — SUSPENDED/DISABLED staff 15
 *     daqiqalik access token bilan ham HECH narsa qila olmasligi kerak
 *     (Bosqich 11, bo'lim 2 — `isActive: Boolean`dan almashtirildi).
 *  2. `StaffSession` (`sessionId` — JWT claim) hali bekor qilinmagan va
 *     muddati o'tmagan — majburiy logout (`revokedAt`) darhol kuchga kiradi.
 *  3. `@RequirePermission(...)` berilgan bo'lsa — HAMMASI `StaffMember.permissions`da bo'lishi shart.
 *  4. `@RequireRole(...)` berilgan bo'lsa (bo'lim 18 — ADR-05's "SETTINGS +
 *     SUPER_ADMIN" naqshi) — `StaffMember.role` shu ro'yxatda bo'lishi
 *     shart. JWT claim'idagi `role`ga ISHONILMAYDI (LIVE DB'dan, xuddi
 *     permissions kabi) — rol pasaytirilsa darhol kuchga kirsin.
 *  5. Bosqich 12, bo'lim 34 — `mustChangePassword === true` bo'lsa, FAQAT
 *     `@AllowWhenPasswordChangeRequired()` bilan belgilangan endpoint'lar
 *     ishlaydi (minimal whitelist: profil, parol almashtirish, TOTP oqimi).
 *     Qolgani `PASSWORD_CHANGE_REQUIRED` (403) bilan rad etiladi.
 */
@Injectable()
export class StaffPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<StaffPermission[] | undefined>(STAFF_PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const requiredRoles =
      this.reflector.getAllAndOverride<StaffRole[] | undefined>(STAFF_ROLE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const allowedWhenPasswordChangeRequired =
      this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const req = context.switchToHttp().getRequest<Request & { staff?: StaffAccessTokenPayload }>();
    const staff = req.staff;
    if (!staff) throw new UnauthenticatedError();

    const [member, session] = await Promise.all([
      this.prisma.staffMember.findUnique({
        where: { id: staff.sub },
        select: { status: true, role: true, permissions: true, mustChangePassword: true },
      }),
      this.prisma.staffSession.findUnique({
        where: { id: staff.sessionId },
        select: { staffId: true, revokedAt: true, expiresAt: true },
      }),
    ]);

    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenError('Hisob faol emas', 'ACCOUNT_BLOCKED');
    }
    if (
      !session ||
      session.staffId !== staff.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthenticatedError('Sessiya tugagan', 'TOKEN_EXPIRED');
    }
    if (required.length > 0 && !required.every((p) => member.permissions.includes(p))) {
      throw new ForbiddenError();
    }
    if (requiredRoles.length > 0 && !requiredRoles.includes(member.role)) {
      throw new ForbiddenError();
    }
    if (member.mustChangePassword && !allowedWhenPasswordChangeRequired) {
      throw new DomainError(
        'PASSWORD_CHANGE_REQUIRED',
        'Davom etishdan oldin parolni almashtirish shart',
      );
    }

    return true;
  }
}
