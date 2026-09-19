import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { StaffPermissionGuard } from './staff-permission.guard';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import { DomainError, ForbiddenError, UnauthenticatedError } from '@/common/errors/domain-error';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import {
  ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY,
  STAFF_PERMISSION_KEY,
  STAFF_ROLE_KEY,
} from '../decorators/require-permission.decorator';

function ctxWithStaff(staff: StaffAccessTokenPayload | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ staff }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const STAFF: StaffAccessTokenPayload = { sub: 'staff-1', role: 'OPERATIONS', sessionId: 'sess-1' };

interface MockMember {
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
}

describe('StaffPermissionGuard', () => {
  function build(
    required: string[] | undefined,
    member: MockMember | null,
    session: { staffId: string; revokedAt: Date | null; expiresAt: Date } | null,
    requiredRoles?: string[],
    allowedWhenPasswordChangeRequired = false,
  ) {
    // Bo'lim 18/Bosqich 12 bo'lim 34 — endi UCHTA metadata kaliti o'qiladi
    // (permission + role + password-change-whitelist); qaysi kalit
    // so'ralganiga qarab mos qiymatni qaytaradi.
    const getAllAndOverride = jest.fn((key: string) => {
      if (key === STAFF_PERMISSION_KEY) return required;
      if (key === STAFF_ROLE_KEY) return requiredRoles;
      if (key === ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY) return allowedWhenPasswordChangeRequired || undefined;
      return undefined;
    });
    const reflector = { getAllAndOverride } as unknown as Reflector;
    const prisma = {
      staffMember: { findUnique: jest.fn().mockResolvedValue(member) },
      staffSession: { findUnique: jest.fn().mockResolvedValue(session) },
    } as unknown as PrismaService;
    return new StaffPermissionGuard(reflector, prisma);
  }

  const liveSession = { staffId: 'staff-1', revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000) };
  const activeMember = (permissions: string[] = [], role = 'OPERATIONS', mustChangePassword = false): MockMember => ({
    status: 'ACTIVE',
    role,
    permissions,
    mustChangePassword,
  });

  it('staff yo‘q (guard tartibi buzilgan) — UnauthenticatedError', async () => {
    const guard = build([], activeMember(), liveSession);
    await expect(guard.canActivate(ctxWithStaff(undefined))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('StaffMember topilmadi/DISABLED — ACCOUNT_BLOCKED (ForbiddenError)', async () => {
    const guard = build([], { status: 'DISABLED', role: 'OPERATIONS', permissions: [], mustChangePassword: false }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('StaffMember SUSPENDED — ACCOUNT_BLOCKED (ForbiddenError) — DISABLED bilan BIR XIL natija', async () => {
    const guard = build([], { status: 'SUSPENDED', role: 'OPERATIONS', permissions: [], mustChangePassword: false }, liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('StaffSession bekor qilingan (majburiy logout) — TOKEN_EXPIRED (hali muddati tugamagan JWT ham)', async () => {
    const revoked = { ...liveSession, revokedAt: new Date() };
    const guard = build([], activeMember(), revoked);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('StaffSession muddati o‘tgan — rad etiladi', async () => {
    const expired = { ...liveSession, expiresAt: new Date(Date.now() - 1_000) };
    const guard = build([], activeMember(), expired);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('sessionId boshqa staff’ga tegishli (soxta claim) — rad etiladi', async () => {
    const otherSession = { ...liveSession, staffId: 'someone-else' };
    const guard = build([], activeMember(), otherSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('@RequirePermission yo‘q — faol/live sessiya kifoya', async () => {
    const guard = build(undefined, activeMember(), liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);
  });

  it('@RequirePermission bor, lekin StaffMember’da YO‘Q — ForbiddenError', async () => {
    const guard = build(['PAYOUT_APPROVE'], activeMember(['DASHBOARD']), liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('bir nechta @RequirePermission — HAMMASI kerak (biri yetishmasa rad)', async () => {
    const guard = build(['DASHBOARD', 'PAYOUT_APPROVE'], activeMember(['DASHBOARD']), liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('kerakli ruxsat(lar) bor — o‘tkazadi', async () => {
    const guard = build(['DASHBOARD'], activeMember(['DASHBOARD', 'AUDIT']), liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);
  });

  // ── Bo'lim 18 — @RequireRole (LIVE DB'dan, JWT claim'iga ISHONILMAYDI) ──

  it('@RequireRole bor, StaffMember.role mos EMAS — ForbiddenError (JWT claim’dagi role e’tiborga olinmaydi)', async () => {
    const guard = build([], activeMember([], 'OPERATIONS'), liveSession, ['SUPER_ADMIN']);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('@RequireRole bor, StaffMember.role LIVE DB’da mos (rol pasaytirilgan bo‘lsa ham darhol kuchga kiradi) — o‘tkazadi', async () => {
    const guard = build([], activeMember([], 'SUPER_ADMIN'), liveSession, ['SUPER_ADMIN']);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);
  });

  it('@RequireRole va @RequirePermission BIRGA — ikkalasi ham talab qilinadi', async () => {
    const guard = build(['STAFF'], activeMember(['STAFF'], 'SUPER_ADMIN'), liveSession, ['SUPER_ADMIN']);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);

    const missingPermission = build(['STAFF'], activeMember([], 'SUPER_ADMIN'), liveSession, ['SUPER_ADMIN']);
    await expect(missingPermission.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });

  // ── Bosqich 12, bo'lim 34 — mustChangePassword hard gate ────────────────

  it('mustChangePassword=true, @AllowWhenPasswordChangeRequired YO‘Q — PASSWORD_CHANGE_REQUIRED bilan rad etiladi', async () => {
    const guard = build(undefined, activeMember([], 'OPERATIONS', true), liveSession);
    const result = guard.canActivate(ctxWithStaff(STAFF));
    await expect(result).rejects.toBeInstanceOf(DomainError);
    await expect(result).rejects.toMatchObject({ code: 'PASSWORD_CHANGE_REQUIRED' });
  });

  it('mustChangePassword=true, @AllowWhenPasswordChangeRequired BOR — o‘tkazadi', async () => {
    const guard = build(undefined, activeMember([], 'OPERATIONS', true), liveSession, undefined, true);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);
  });

  it('mustChangePassword=false — whitelist’siz ham normal o‘tadi', async () => {
    const guard = build(undefined, activeMember([], 'OPERATIONS', false), liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).resolves.toBe(true);
  });

  it('mustChangePassword=true HAMDA @RequirePermission yetishmasa — avval ForbiddenError (permission tekshiruvi oldin)', async () => {
    const guard = build(['PAYOUT_APPROVE'], activeMember(['DASHBOARD'], 'OPERATIONS', true), liveSession);
    await expect(guard.canActivate(ctxWithStaff(STAFF))).rejects.toBeInstanceOf(ForbiddenError);
  });
});
