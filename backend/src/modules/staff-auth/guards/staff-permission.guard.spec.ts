import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { StaffPermissionGuard } from './staff-permission.guard';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import { ForbiddenError, UnauthenticatedError } from '@/common/errors/domain-error';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';

function ctxWithStaff(staff: StaffAccessTokenPayload | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ staff }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const STAFF: StaffAccessTokenPayload = { sub: 'staff-1', role: 'OPERATIONS', sessionId: 'sess-1' };

describe('StaffPermissionGuard', () => {
  function build(
    required: string[] | undefined,
    member: { isActive: boolean; permissions: string[] } | null,
    session: { staffId: string; revokedAt: Date | null; expiresAt: Date } | null,
  ) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    const prisma = {
      staffMember: { findUnique: jest.fn().mockResolvedValue(member) },
      staffSession: { findUnique: jest.fn().mockResolvedValue(session) },
    } as unknown as PrismaService;
    return new StaffPermissionGuard(reflector, prisma);
  }

  const liveSession = { staffId: 'staff-1', revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000) };

  it('staff yo‘q (guard tartibi buzilgan) — UnauthenticatedError', async () => {
    const guard = build([], { isActive: true, permissions: [] }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(undefined))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('StaffMember topilmadi/bloklangan — ACCOUNT_BLOCKED (ForbiddenError)', async () => {
    const guard = build([], { isActive: false, permissions: [] }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('StaffSession bekor qilingan (majburiy logout) — TOKEN_EXPIRED (hali muddati tugamagan JWT ham)', async () => {
    const revoked = { ...liveSession, revokedAt: new Date() };
    const guard = build([], { isActive: true, permissions: [] }, revoked);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('StaffSession muddati o‘tgan — rad etiladi', async () => {
    const expired = { ...liveSession, expiresAt: new Date(Date.now() - 1_000) };
    const guard = build([], { isActive: true, permissions: [] }, expired);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('sessionId boshqa staff’ga tegishli (soxta claim) — rad etiladi', async () => {
    const otherSession = { ...liveSession, staffId: 'someone-else' };
    const guard = build([], { isActive: true, permissions: [] }, otherSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('@RequirePermission yo‘q — faol/live sessiya kifoya', async () => {
    const guard = build(undefined, { isActive: true, permissions: [] }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);
  });

  it('@RequirePermission bor, lekin StaffMember’da YO‘Q — ForbiddenError', async () => {
    const guard = build(['PAYOUT_APPROVE'], { isActive: true, permissions: ['DASHBOARD'] }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('bir nechta @RequirePermission — HAMMASI kerak (biri yetishmasa rad)', async () => {
    const guard = build(['DASHBOARD', 'PAYOUT_APPROVE'], { isActive: true, permissions: ['DASHBOARD'] }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('kerakli ruxsat(lar) bor — o‘tkazadi', async () => {
    const guard = build(['DASHBOARD'], { isActive: true, permissions: ['DASHBOARD', 'AUDIT'] }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);
  });
});
