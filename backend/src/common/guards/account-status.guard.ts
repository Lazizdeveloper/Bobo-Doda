import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { DomainError, UnauthenticatedError } from '@/common/errors/domain-error';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';

/**
 * Bosqich 3 — qayta ishlatiladigan hisob-holati tekshiruvi. Marketplace
 * mutatsiya marshrutlarida `@UseGuards(AccountStatusGuard)` (`JwtAuthGuard`
 * DAN KEYIN) qo'shiladi. O'QISH endpoint'larida QO'LLANILMAYDI — bloklangan
 * foydalanuvchi ham o'z ma'lumotini ko'ra olishi kerak, faqat YOZOLMAYDI.
 *
 * ATAYLAB LIVE DB o'qish (JWT'ga hech qachon keshlanmaydi) — ADR-04/Bosqich 2
 * bilan bir xil falsafa: admin foydalanuvchini HOZIR bloklasa, uning 15
 * daqiqalik access tokeni bilan keyingi write so'rovi DARHOL rad etilishi
 * kerak, token muddati tugashini kutmasdan.
 */
@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const user = req.user;
    if (!user) throw new UnauthenticatedError();

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { status: true, suspendedUntil: true },
    });
    if (!dbUser) throw new UnauthenticatedError();

    if (dbUser.status === 'BLOCKED') {
      throw new DomainError('ACCOUNT_BLOCKED', 'Hisob bloklangan');
    }
    if (dbUser.status === 'SUSPENDED') {
      // Muddatli suspenziya — lazy auto-expiry: `suspendedUntil` o'tgan
      // bo'lsa shu yerda ACTIVE'ga qaytariladi (cron/worker shart emas,
      // OTP/refresh token muddati bilan bir xil "lazy expiry" naqshi).
      // Muddatsiz suspenziya (`suspendedUntil = null`) — FAQAT staff qarori
      // bilan tugaydi.
      const expired = dbUser.suspendedUntil !== null && dbUser.suspendedUntil <= new Date();
      if (!expired) {
        throw new DomainError('ACCOUNT_SUSPENDED', 'Hisob vaqtincha cheklangan');
      }
      await this.prisma.user.updateMany({
        where: { id: user.sub, status: 'SUSPENDED', suspendedUntil: dbUser.suspendedUntil },
        data: { status: 'ACTIVE', suspendedUntil: null, statusReason: null, statusChangedAt: new Date() },
      });
    }
    return true;
  }
}
