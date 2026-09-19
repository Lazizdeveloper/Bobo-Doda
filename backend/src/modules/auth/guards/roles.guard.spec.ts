import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import { ForbiddenError, UnauthenticatedError } from '@/common/errors/domain-error';
import type { AccessTokenPayload } from '../types/token-payload';

function ctxWithUser(user: AccessTokenPayload | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard (ADR-04 — ikki bosqichli avtorizatsiya)', () => {
  function build(required: string[] | undefined, dbUser: { roles: string[]; deletedAt: Date | null } | null) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(dbUser) },
    } as unknown as PrismaService;
    return new RolesGuard(reflector, prisma);
  }

  it('`@Roles()` yo‘q bo‘lsa — hech narsa tekshirmasdan o‘tkazadi', async () => {
    const guard = build(undefined, null);
    await expect(guard.canActivate(ctxWithUser({ sub: 'u1', activeRole: 'BUYER', familyId: 'f' }))).resolves.toBe(
      true,
    );
  });

  it('user umuman yo‘q (guard tartibi buzilgan) — UnauthenticatedError', async () => {
    const guard = build(['BUYER'], null);
    await expect(guard.canActivate(ctxWithUser(undefined))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('activeRole=null (rol tanlanmagan) — HAR DOIM rad etiladi', async () => {
    const guard = build(['BUYER'], { roles: ['BUYER'], deletedAt: null });
    await expect(
      guard.canActivate(ctxWithUser({ sub: 'u1', activeRole: null, familyId: 'f' })),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('activeRole kontekstga mos EMAS (masalan SELLER talab, BUYER kontekst) — rad etiladi', async () => {
    const guard = build(['SELLER'], { roles: ['SELLER', 'BUYER'], deletedAt: null });
    await expect(
      guard.canActivate(ctxWithUser({ sub: 'u1', activeRole: 'BUYER', familyId: 'f' })),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('activeRole mos, lekin DB’da (LIVE) shu rol endi YO‘Q — rad etiladi (JWT-cache’ga ishonilmaydi)', async () => {
    // JWT eski — foydalanuvchi SELLER edi, admin uni olib tashlagan.
    const guard = build(['SELLER'], { roles: ['BUYER'], deletedAt: null });
    await expect(
      guard.canActivate(ctxWithUser({ sub: 'u1', activeRole: 'SELLER', familyId: 'f' })),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('foydalanuvchi o‘chirilgan (deletedAt) — mos rol bo‘lsa ham rad etiladi', async () => {
    const guard = build(['BUYER'], { roles: ['BUYER'], deletedAt: new Date() });
    await expect(
      guard.canActivate(ctxWithUser({ sub: 'u1', activeRole: 'BUYER', familyId: 'f' })),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('kontekst VA layoqat ikkalasi ham to‘g‘ri — o‘tkazadi', async () => {
    const guard = build(['BUYER'], { roles: ['BUYER', 'SELLER'], deletedAt: null });
    await expect(
      guard.canActivate(ctxWithUser({ sub: 'u1', activeRole: 'BUYER', familyId: 'f' })),
    ).resolves.toBe(true);
  });
});
