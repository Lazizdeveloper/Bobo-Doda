import type { ExecutionContext } from '@nestjs/common';
import { AccountStatusGuard } from './account-status.guard';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import { DomainError, UnauthenticatedError } from '@/common/errors/domain-error';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';

function ctxWithUser(user: AccessTokenPayload | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const USER: AccessTokenPayload = { sub: 'u1', activeRole: 'BUYER', familyId: 'f' };

describe('AccountStatusGuard', () => {
  function build(dbUser: { status: string; suspendedUntil: Date | null } | null) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(dbUser),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;
    return { guard: new AccountStatusGuard(prisma), prisma };
  }

  it('user yo‘q (guard tartibi buzilgan) — UnauthenticatedError', async () => {
    const { guard } = build(null);
    await expect(guard.canActivate(ctxWithUser(undefined))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('DB’da topilmasa — UnauthenticatedError', async () => {
    const { guard } = build(null);
    await expect(guard.canActivate(ctxWithUser(USER))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('ACTIVE — o‘tkazadi', async () => {
    const { guard } = build({ status: 'ACTIVE', suspendedUntil: null });
    await expect(guard.canActivate(ctxWithUser(USER))).resolves.toBe(true);
  });

  it('BLOCKED — ACCOUNT_BLOCKED', async () => {
    const { guard } = build({ status: 'BLOCKED', suspendedUntil: null });
    await expect(guard.canActivate(ctxWithUser(USER))).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED' });
  });

  it('SUSPENDED muddatsiz — ACCOUNT_SUSPENDED', async () => {
    const { guard } = build({ status: 'SUSPENDED', suspendedUntil: null });
    await expect(guard.canActivate(ctxWithUser(USER))).rejects.toBeInstanceOf(DomainError);
    const { guard: guard2 } = build({ status: 'SUSPENDED', suspendedUntil: null });
    await expect(guard2.canActivate(ctxWithUser(USER))).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
  });

  it('SUSPENDED muddati hali tugamagan — ACCOUNT_SUSPENDED', async () => {
    const future = new Date(Date.now() + 60_000);
    const { guard } = build({ status: 'SUSPENDED', suspendedUntil: future });
    await expect(guard.canActivate(ctxWithUser(USER))).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
  });

  it('SUSPENDED muddati o‘tgan — lazy auto-expiry, o‘tkazadi VA ACTIVE’ga yozadi', async () => {
    const past = new Date(Date.now() - 60_000);
    const { guard, prisma } = build({ status: 'SUSPENDED', suspendedUntil: past });
    await expect(guard.canActivate(ctxWithUser(USER))).resolves.toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
  });
});
