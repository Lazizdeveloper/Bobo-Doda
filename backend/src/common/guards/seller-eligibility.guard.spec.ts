import type { ExecutionContext } from '@nestjs/common';
import { SellerEligibilityGuard } from './seller-eligibility.guard';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import { UnauthenticatedError } from '@/common/errors/domain-error';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';

function ctxWithUser(user: AccessTokenPayload | undefined): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as unknown as ExecutionContext;
}

const USER: AccessTokenPayload = { sub: 'u1', activeRole: 'SELLER', familyId: 'f' };

describe('SellerEligibilityGuard', () => {
  function build(sellerStatus: string | null) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(sellerStatus ? { sellerStatus } : null) },
    } as unknown as PrismaService;
    return new SellerEligibilityGuard(prisma);
  }

  it('user yo‘q — UnauthenticatedError', async () => {
    const guard = build('APPROVED');
    await expect(guard.canActivate(ctxWithUser(undefined))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it.each(['NOT_APPLIED', 'PENDING', 'REJECTED', 'SUSPENDED'])(
    'sellerStatus=%s — SELLER_NOT_APPROVED',
    async (status) => {
      const guard = build(status);
      await expect(guard.canActivate(ctxWithUser(USER))).rejects.toMatchObject({
        code: 'SELLER_NOT_APPROVED',
      });
    },
  );

  it('sellerStatus=APPROVED — o‘tkazadi', async () => {
    const guard = build('APPROVED');
    await expect(guard.canActivate(ctxWithUser(USER))).resolves.toBe(true);
  });
});
