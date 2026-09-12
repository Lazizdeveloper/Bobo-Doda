import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { DomainError } from '@/common/errors/domain-error';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';

/**
 * Bosqich 3 — hisob moderatsiyasi (`User.status`). To'liq admin foydalanuvchi
 * boshqaruvi (qidiruv, ro'yxat, filtrlar) — Bosqich 11 (Admin APIs) scope'i;
 * bu yerda faqat DoD talab qilgan minimal amal (suspend/block/reactivate +
 * audit).
 */
@Injectable()
export class StaffUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async suspend(userId: string, reason: string, suspendedUntil: string | undefined, actor: AuditActor): Promise<void> {
    const cas = await this.prisma.user.updateMany({
      where: { id: userId, status: 'ACTIVE' },
      data: {
        status: 'SUSPENDED',
        statusReason: reason,
        statusChangedAt: new Date(),
        suspendedUntil: suspendedUntil ? new Date(suspendedUntil) : null,
      },
    });
    if (cas.count === 0) {
      throw new DomainError('INVALID_TRANSITION', 'Faqat faol hisobni cheklash mumkin');
    }
    await this.audit.record({
      actor,
      action: 'USER_SUSPENDED',
      resourceType: 'USER',
      resourceId: userId,
      previousState: { status: 'ACTIVE' },
      newState: { status: 'SUSPENDED', reason, suspendedUntil },
    });
  }

  async block(userId: string, reason: string, actor: AuditActor): Promise<void> {
    const cas = await this.prisma.user.updateMany({
      where: { id: userId, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      data: { status: 'BLOCKED', statusReason: reason, statusChangedAt: new Date(), suspendedUntil: null },
    });
    if (cas.count === 0) {
      throw new DomainError('INVALID_TRANSITION', 'Bu hisob allaqachon bloklangan');
    }
    await this.audit.record({
      actor,
      action: 'USER_BLOCKED',
      resourceType: 'USER',
      resourceId: userId,
      newState: { status: 'BLOCKED', reason },
    });
  }

  async reactivate(userId: string, actor: AuditActor): Promise<void> {
    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { status: true },
    });
    const cas = await this.prisma.user.updateMany({
      where: { id: userId, status: { in: ['SUSPENDED', 'BLOCKED'] } },
      data: { status: 'ACTIVE', statusReason: null, suspendedUntil: null, statusChangedAt: new Date() },
    });
    if (cas.count === 0) {
      throw new DomainError('INVALID_TRANSITION', 'Bu hisob allaqachon faol');
    }
    await this.audit.record({
      actor,
      action: 'USER_REACTIVATED',
      resourceType: 'USER',
      resourceId: userId,
      previousState: { status: existing.status },
      newState: { status: 'ACTIVE' },
    });
  }
}
