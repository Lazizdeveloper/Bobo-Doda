import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { DomainError, UnauthenticatedError } from '@/common/errors/domain-error';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';

/**
 * Bosqich 3 — "role = SELLER" (layoqat) ≠ "sotuvchi sifatida FAOL ishlash
 * huquqi" (spec talabi, aniq ajratilgan). `RolesGuard(Role.SELLER)` faqat
 * `User.roles`/`activeRole`ni tekshiradi — bu YANGI, MUSTAQIL guard
 * `User.sellerStatus === APPROVED`ni LIVE tekshiradi (KYC/moderatsiya
 * natijasi). Ikkalasi BIRGA qo'yiladi (`@UseGuards(RolesGuard,
 * SellerEligibilityGuard)`), biri ikkinchisini ALMASHTIRMAYDI.
 */
@Injectable()
export class SellerEligibilityGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const user = req.user;
    if (!user) throw new UnauthenticatedError();

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { sellerStatus: true },
    });
    if (!dbUser || dbUser.sellerStatus !== 'APPROVED') {
      throw new DomainError('SELLER_NOT_APPROVED', "Sotuvchi sifatida tasdiqlanmagansiz");
    }
    return true;
  }
}
