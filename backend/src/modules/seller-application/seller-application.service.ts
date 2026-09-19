import { Injectable } from '@nestjs/common';
import { Prisma, type SellerApplication, type SellerStatus } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { DomainError, NotFoundError } from '@/common/errors/domain-error';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';
import { OutboxService } from '@/common/outbox/outbox.service';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

/**
 * "role = SELLER" (layoqat) va "sotuvchi sifatida FAOL" (`User.sellerStatus`)
 * — ataylab ajratilgan (Bosqich 3 spec). Bu servis IKKINCHISINI boshqaradi:
 * arizalar (`SellerApplication`) VA `User.sellerStatus` ko'zgusi BITTA
 * tranzaksiyada, doim sinxron.
 */
@Injectable()
export class SellerApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async getCurrentForUser(userId: string): Promise<SellerApplication | null> {
    return this.prisma.sellerApplication.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getByIdOrThrow(id: string): Promise<SellerApplication> {
    const app = await this.prisma.sellerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundError('Ariza topilmadi', 'SELLER_APPLICATION_NOT_FOUND');
    return app;
  }

  async listForStaff(
    page: number,
    perPage: number,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ): Promise<Page<SellerApplication>> {
    const where = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sellerApplication.findMany({
        where,
        orderBy: { submittedAt: 'asc' }, // navbat — eski birinchi (FIFO)
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.sellerApplication.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  async submit(
    userId: string,
    input: { legalName: string; displayName: string; description?: string },
  ): Promise<SellerApplication> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.sellerStatus === 'APPROVED') {
      throw new DomainError('BAD_STATE', 'Siz allaqachon tasdiqlangan sotuvchisiz');
    }
    if (user.sellerStatus === 'SUSPENDED') {
      throw new DomainError('BAD_STATE', 'Sotuvchi huquqingiz to‘xtatilgan — staff bilan bog‘laning');
    }

    try {
      const [application] = await this.prisma.$transaction([
        this.prisma.sellerApplication.create({
          data: {
            id: this.ids.next(),
            userId,
            legalName: input.legalName,
            displayName: input.displayName,
            description: input.description,
          },
        }),
        this.prisma.user.update({ where: { id: userId }, data: { sellerStatus: 'PENDING' } }),
      ]);
      await this.audit.record({
        actor: { id: userId, type: 'USER', name: input.displayName },
        action: 'SELLER_APPLICATION_SUBMITTED',
        resourceType: 'SELLER_APPLICATION',
        resourceId: application.id,
        newState: { status: 'PENDING' },
      });
      return application;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        // Partial unique index (`seller_applications_one_pending_per_user`) —
        // parallel ikkinchi so'rov shu yerda ILOVA DARAJASIDA emas, DB
        // CONSTRAINT orqali rad etiladi.
        throw new DomainError('SELLER_APPLICATION_ALREADY_PENDING', 'Sizda ko‘rib chiqilayotgan ariza bor');
      }
      throw err;
    }
  }

  async approve(id: string, actor: AuditActor): Promise<SellerApplication> {
    const existing = await this.getByIdOrThrow(id);
    const result = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.sellerApplication.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'APPROVED', reviewedAt: new Date(), reviewedByStaffId: actor.id },
      });
      if (cas.count === 0) return null;

      // ADR-04: "SELLER qo'shish → KYC talab qilinadi" — ariza tasdiqlanishi
      // AYNAN shu KYC darvozasi. `roles[]` (layoqat) shu yerda, birinchi
      // marta tasdiqlanganda kengayadi (`push` dublikat qilib qo'ymasin —
      // avval tekshiramiz).
      const applicant = await tx.user.findUniqueOrThrow({
        where: { id: existing.userId },
        select: { roles: true },
      });
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          sellerStatus: 'APPROVED',
          roles: applicant.roles.includes('SELLER') ? undefined : { push: 'SELLER' },
        },
      });
      await this.audit.record(
        {
          actor,
          action: 'SELLER_APPLICATION_APPROVED',
          resourceType: 'SELLER_APPLICATION',
          resourceId: id,
          contextId: existing.userId,
          previousState: { status: 'PENDING' },
          newState: { status: 'APPROVED' },
        },
        tx,
      );
      await this.outbox.enqueue(
        {
          aggregateType: 'SELLER_APPLICATION',
          aggregateId: id,
          eventType: 'SELLER_APPLICATION_APPROVED',
          payload: { userId: existing.userId },
        },
        tx,
      );
      return tx.sellerApplication.findUniqueOrThrow({ where: { id } });
    });

    if (!result) {
      throw new DomainError('INVALID_TRANSITION', 'Ariza allaqachon hal qilingan');
    }
    return result;
  }

  async reject(id: string, reason: string, actor: AuditActor): Promise<SellerApplication> {
    const existing = await this.getByIdOrThrow(id);
    const result = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.sellerApplication.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedByStaffId: actor.id,
          rejectionReason: reason,
        },
      });
      if (cas.count === 0) return null;

      await tx.user.update({ where: { id: existing.userId }, data: { sellerStatus: 'REJECTED' } });
      await this.audit.record(
        {
          actor,
          action: 'SELLER_APPLICATION_REJECTED',
          resourceType: 'SELLER_APPLICATION',
          resourceId: id,
          contextId: existing.userId,
          previousState: { status: 'PENDING' },
          newState: { status: 'REJECTED', reason },
        },
        tx,
      );
      await this.outbox.enqueue(
        {
          aggregateType: 'SELLER_APPLICATION',
          aggregateId: id,
          eventType: 'SELLER_APPLICATION_REJECTED',
          payload: { userId: existing.userId, reason },
        },
        tx,
      );
      return tx.sellerApplication.findUniqueOrThrow({ where: { id } });
    });

    if (!result) {
      throw new DomainError('INVALID_TRANSITION', 'Ariza allaqachon hal qilingan');
    }
    return result;
  }

  /** Ariza ORQALI EMAS — staff to'g'ridan-to'g'ri (APPROVED → SUSPENDED). */
  async suspendSeller(userId: string, reason: string, actor: AuditActor): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const cas = await tx.user.updateMany({
        where: { id: userId, sellerStatus: 'APPROVED' },
        data: { sellerStatus: 'SUSPENDED' },
      });
      if (cas.count === 0) {
        throw new DomainError('INVALID_TRANSITION', 'Faqat tasdiqlangan sotuvchini to‘xtatish mumkin');
      }
      await this.audit.record(
        {
          actor,
          action: 'SELLER_SUSPENDED',
          resourceType: 'USER',
          resourceId: userId,
          previousState: { sellerStatus: 'APPROVED' },
          newState: { sellerStatus: 'SUSPENDED', reason },
        },
        tx,
      );
      // Bosqich 11, bo'lim 52 — `EVENT_ROUTES`da ro'yxatdan o'tgan (aks
      // holda Outbox worker buni UNSUPPORTED_EVENT deb DEAD qilib qo'yardi).
      await this.outbox.enqueue({ aggregateType: 'USER', aggregateId: userId, eventType: 'SELLER_SUSPENDED', payload: {} }, tx);
    });
  }

  async reinstateSeller(userId: string, actor: AuditActor): Promise<void> {
    const cas = await this.prisma.user.updateMany({
      where: { id: userId, sellerStatus: 'SUSPENDED' },
      data: { sellerStatus: 'APPROVED' },
    });
    if (cas.count === 0) {
      throw new DomainError('INVALID_TRANSITION', 'Faqat to‘xtatilgan sotuvchini tiklash mumkin');
    }
    await this.audit.record({
      actor,
      action: 'SELLER_REINSTATED',
      resourceType: 'USER',
      resourceId: userId,
      previousState: { sellerStatus: 'SUSPENDED' },
      newState: { sellerStatus: 'APPROVED' },
    });
  }

  // ── Bosqich 11, bo'lim 26 — operatsion ko'rinish (o'qish, mutatsiya YO'Q) ──

  /** Sukut — `NOT_APPLIED` bo'lmagan (haqiqatan sotuvchilik bilan bog'liq bo'lgan) foydalanuvchilar. */
  async listSellersForStaff(
    filters: { sellerStatus?: SellerStatus },
    page: number,
    perPage: number,
  ): Promise<Page<{ id: string; phone: string; fullName: string | null; sellerStatus: SellerStatus; createdAt: Date }>> {
    const where: Prisma.UserWhereInput = {
      sellerStatus: filters.sellerStatus ?? { not: 'NOT_APPLIED' },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: { id: true, phone: true, fullName: true, sellerStatus: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  /** Bo'lim 26 — MINIMAL foydali ko'rinish: bounded COUNT'lar, giant include YO'Q. */
  async getSellerDetailByIdOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, fullName: true, sellerStatus: true, verified: true, createdAt: true },
    });
    if (!user) throw new NotFoundError('Foydalanuvchi topilmadi', 'USER_NOT_FOUND');
    const [servicesCount, contractsAsSellerCount, payoutsSucceededCount, disputesAsSellerCount] = await Promise.all([
      this.prisma.service.count({ where: { sellerId: userId } }),
      this.prisma.contract.count({ where: { sellerId: userId } }),
      this.prisma.payout.count({ where: { sellerId: userId, status: 'SUCCEEDED' } }),
      this.prisma.dispute.count({ where: { contract: { sellerId: userId } } }),
    ]);
    return { ...user, servicesCount, contractsAsSellerCount, payoutsSucceededCount, disputesAsSellerCount };
  }
}
