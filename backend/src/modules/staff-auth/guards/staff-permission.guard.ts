import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { StaffPermission } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { ForbiddenError, UnauthenticatedError } from '@/common/errors/domain-error';
import { STAFF_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';

/**
 * `StaffJwtAuthGuard`DAN KEYIN ishlaydi (`@UseGuards` tartibida ikkinchi).
 * HAR staff so'rovda LIVE tekshiradi (`@RequirePermission()` yo'q bo'lsa
 * ham) — chunki bu YERDA staff hisobi/sessiyasi HALI ham amal qiladimi
 * tekshiruvi ham bor, faqat ruxsat emas:
 *
 *  1. `StaffMember.isActive` — bloklangan staff 15 daqiqalik access token
 *     bilan ham HECH narsa qila olmasligi kerak.
 *  2. `StaffSession` (`sessionId` — JWT claim) hali bekor qilinmagan va
 *     muddati o'tmagan — majburiy logout (`revokedAt`) darhol kuchga kiradi.
 *  3. `@RequirePermission(...)` berilgan bo'lsa — HAMMASI `StaffMember.permissions`da bo'lishi shart.
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

    const req = context.switchToHttp().getRequest<Request & { staff?: StaffAccessTokenPayload }>();
    const staff = req.staff;
    if (!staff) throw new UnauthenticatedError();

    const [member, session] = await Promise.all([
      this.prisma.staffMember.findUnique({
        where: { id: staff.sub },
        select: { isActive: true, permissions: true },
      }),
      this.prisma.staffSession.findUnique({
        where: { id: staff.sessionId },
        select: { staffId: true, revokedAt: true, expiresAt: true },
      }),
    ]);

    if (!member || !member.isActive) {
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

    return true;
  }
}
