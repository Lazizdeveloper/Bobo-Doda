import { Injectable } from '@nestjs/common';
import { Prisma, type StaffMember, type StaffPermission, type StaffStatus } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { HashService } from '@/common/security/hash.service';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';
import { DomainError, ForbiddenError, NotFoundError } from '@/common/errors/domain-error';
import { generateOpaqueToken } from '@/common/security/opaque-token.util';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';

export interface ListStaffFilters {
  status?: StaffStatus;
  email?: string;
  permission?: StaffPermission;
  createdFrom?: Date;
  createdTo?: Date;
}

/**
 * Bosqich 11 — staff lifecycle/permissions boshqaruvi. TOTP reset, parol
 * reset, sessiya bekor qilish `StaffAuthService`da QOLADI (bo'lim 74's
 * "duplicate admin API yaratma" — bir amal, bir joy; bu servis FAQAT
 * StaffMember qatorining o'zi — status/permissions/yaratish/ro'yxat).
 */
@Injectable()
export class StaffAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly hash: HashService,
    private readonly audit: AuditService,
  ) {}

  async create(
    input: { email: string; fullName: string; title: string; role: StaffMember['role']; permissions: StaffPermission[] },
    actor: AuditActor,
  ): Promise<{ staff: StaffMember; tempPassword: string }> {
    const existing = await this.prisma.staffMember.findUnique({ where: { email: input.email } });
    if (existing) throw new DomainError('ALREADY_EXISTS', 'Bu email bilan staff hisobi allaqachon bor');

    const tempPassword = generateOpaqueToken();
    const staff = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staffMember.create({
        data: {
          id: this.ids.next(),
          email: input.email,
          fullName: input.fullName,
          title: input.title,
          role: input.role,
          permissions: input.permissions,
          passwordHash: await this.hash.hash(tempPassword),
          mustChangePassword: true,
        },
      });
      await this.audit.record(
        {
          actor,
          action: 'STAFF_CREATED',
          resourceType: 'STAFF_MEMBER',
          resourceId: created.id,
          newState: { email: input.email, role: input.role, permissions: input.permissions },
        },
        tx,
      );
      return created;
    });
    return { staff, tempPassword };
  }

  async listForStaff(filters: ListStaffFilters, page: number, perPage: number): Promise<Page<StaffMember>> {
    const where: Prisma.StaffMemberWhereInput = {
      status: filters.status,
      email: filters.email ? { contains: filters.email, mode: 'insensitive' } : undefined,
      permissions: filters.permission ? { has: filters.permission } : undefined,
      createdAt:
        filters.createdFrom || filters.createdTo
          ? { gte: filters.createdFrom, lte: filters.createdTo }
          : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.staffMember.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.staffMember.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  async getByIdOrThrow(id: string): Promise<StaffMember> {
    const staff = await this.prisma.staffMember.findUnique({ where: { id } });
    if (!staff) throw new NotFoundError('Staff topilmadi', 'NOT_FOUND');
    return staff;
  }

  /** Bo'lim 18 — o'ziga TEGISHLI EMAS (o'z ruxsatlarini o'zi oshira olmaydi/kamaytira olmaydi). */
  async updatePermissions(targetId: string, permissions: StaffPermission[], actor: AuditActor): Promise<StaffMember> {
    if (targetId === actor.id) {
      throw new ForbiddenError("O'z ruxsatlaringizni o'zingiz o'zgartira olmaysiz", 'FORBIDDEN');
    }
    const existing = await this.getByIdOrThrow(targetId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.staffMember.update({ where: { id: targetId }, data: { permissions } });
      await this.audit.record(
        {
          actor,
          action: 'STAFF_PERMISSIONS_UPDATED',
          resourceType: 'STAFF_MEMBER',
          resourceId: targetId,
          previousState: { permissions: existing.permissions },
          newState: { permissions },
        },
        tx,
      );
      return result;
    });
    return updated;
  }

  async suspend(targetId: string, reason: string, actor: AuditActor): Promise<StaffMember> {
    return this.transition(targetId, 'SUSPENDED', reason, 'STAFF_SUSPENDED', actor);
  }

  async disable(targetId: string, reason: string, actor: AuditActor): Promise<StaffMember> {
    return this.transition(targetId, 'DISABLED', reason, 'STAFF_DISABLED', actor);
  }

  async reactivate(targetId: string, actor: AuditActor): Promise<StaffMember> {
    const existing = await this.getByIdOrThrow(targetId);
    if (existing.status === 'ACTIVE') {
      throw new DomainError('INVALID_TRANSITION', 'Bu hisob allaqachon faol');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.staffMember.updateMany({
        where: { id: targetId, status: { in: ['SUSPENDED', 'DISABLED'] } },
        data: { status: 'ACTIVE', statusReason: null, statusChangedAt: new Date() },
      });
      if (cas.count === 0) throw new DomainError('INVALID_TRANSITION', 'Bu hisob allaqachon faol');
      await this.audit.record(
        {
          actor,
          action: 'STAFF_REACTIVATED',
          resourceType: 'STAFF_MEMBER',
          resourceId: targetId,
          previousState: { status: existing.status },
          newState: { status: 'ACTIVE' },
        },
        tx,
      );
      return tx.staffMember.findUniqueOrThrow({ where: { id: targetId } });
    });
    return updated;
  }

  private async transition(
    targetId: string,
    toStatus: 'SUSPENDED' | 'DISABLED',
    reason: string,
    auditAction: 'STAFF_SUSPENDED' | 'STAFF_DISABLED',
    actor: AuditActor,
  ): Promise<StaffMember> {
    if (targetId === actor.id) {
      throw new ForbiddenError("O'zingizni cheklay olmaysiz", 'FORBIDDEN');
    }
    const existing = await this.getByIdOrThrow(targetId);

    // Bo'lim 19 — oxirgi FAOL SUPER_ADMIN'ni cheklab qo'yish orqali
    // platformani boshqaruvchisiz qoldirish TAQIQLANADI.
    if (existing.role === 'SUPER_ADMIN' && existing.status === 'ACTIVE') {
      const otherActiveSuperAdmins = await this.prisma.staffMember.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE', id: { not: targetId } },
      });
      if (otherActiveSuperAdmins === 0) {
        throw new DomainError(
          'LAST_ADMIN_PROTECTED',
          "Bu — yagona faol SUPER_ADMIN. Avval boshqa SUPER_ADMIN tayinlang.",
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.staffMember.updateMany({
        where: { id: targetId, status: 'ACTIVE' },
        data: { status: toStatus, statusReason: reason, statusChangedAt: new Date() },
      });
      if (cas.count === 0) throw new DomainError('INVALID_TRANSITION', 'Faqat faol hisobni cheklash mumkin');
      await tx.staffSession.updateMany({ where: { staffId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(
        {
          actor,
          action: auditAction,
          resourceType: 'STAFF_MEMBER',
          resourceId: targetId,
          previousState: { status: 'ACTIVE' },
          newState: { status: toStatus, reason },
        },
        tx,
      );
      return tx.staffMember.findUniqueOrThrow({ where: { id: targetId } });
    });
    return updated;
  }
}
