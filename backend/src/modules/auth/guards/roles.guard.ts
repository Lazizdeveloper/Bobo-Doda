import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { ForbiddenError, UnauthenticatedError } from '@/common/errors/domain-error';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AccessTokenPayload } from '../types/token-payload';

/**
 * ADR-04 — IKKI BOSQICHLI avtorizatsiya. `@Roles()` yo'q marshrutlarda
 * (metadata yo'q) hech narsa tekshirmaydi — faqat autentifikatsiya kifoya
 * (`JwtAuthGuard` allaqachon o'tgan).
 *
 *  1. KONTEKST — `user.activeRole` (JWT claim, DB shart emas): sessiya
 *     HOZIR shu rol sifatida ishlayaptimi. `null` (rol tanlanmagan) — doim
 *     rad etiladi.
 *  2. LAYOQAT — LIVE DB o'qish (`User.roles`): foydalanuvchi HAQIQATDA shu
 *     rolga ega EKANI. JWT-cache'ga ishonilmaydi — chunki admin foydalanuvchi
 *     rolini/hisobini o'zgartirsa, bu access token muddati (15 daqiqa)
 *     tugagunga qadar "bexabar" bo'lib qolmasligi kerak.
 *
 * Ob'ekt egaligi (masalan "bu shartnoma sizniki emas") BU YERDA YO'Q — har
 * domen servisi o'z query-scoping'i bilan tekshiradi.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      import('@prisma/client').Role[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const user = req.user;
    if (!user) throw new UnauthenticatedError();

    if (!user.activeRole || !required.includes(user.activeRole)) {
      throw new ForbiddenError(
        "Bu amal uchun boshqa rol (kabinet) tanlangan bo'lishi kerak",
        'NOT_ALLOWED',
      );
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { roles: true, deletedAt: true },
    });
    if (!dbUser || dbUser.deletedAt || !dbUser.roles.includes(user.activeRole)) {
      throw new ForbiddenError();
    }

    return true;
  }
}
