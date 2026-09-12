import { Injectable } from '@nestjs/common';
import type { Prisma, Service } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { DomainError, NotFoundError } from '@/common/errors/domain-error';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';
import { OutboxService } from '@/common/outbox/outbox.service';
import { somToTiyin } from '@/common/money/money.util';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';
import type { ListServicesQueryDto } from './dto/list-services-query.dto';

/** PATCH bilan tahrirlash mumkin bo'lgan holatlar — moderatsiya kutayotgan/arxivlangan EMAS. */
const EDITABLE_STATUSES: Service['status'][] = ['DRAFT', 'REJECTED', 'ACTIVE', 'PAUSED'];
/** Arxivlash mumkin bo'lgan holatlar (bo'lim 10/11 — ACTIVE/PAUSED/DRAFT dan). */
const ARCHIVABLE_STATUSES: Service['status'][] = ['DRAFT', 'ACTIVE', 'PAUSED'];

/**
 * `Service` — to'liq umr davri BITTA joyda: yaratish, egasi tahriri, holat
 * mashinasi (har o'tish — ALOHIDA metod, spec talabi), staff moderatsiyasi,
 * public ko'rish. Bitta modul chegarasidan chiqmaydi (`docs/01`: "bir modul
 * boshqasining Prisma modeliga tegmaydi").
 */
@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  // ── Egasi (seller) ───────────────────────────────────────────────────

  async createDraft(sellerId: string, dto: CreateServiceDto): Promise<Service> {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundError('Kategoriya topilmadi', 'CATEGORY_NOT_FOUND');
    if (category.status !== 'ACTIVE') {
      throw new DomainError('CATEGORY_DISABLED', 'Bu kategoriyada yangi xizmat yaratib bo‘lmaydi');
    }

    return this.prisma.service.create({
      data: {
        id: this.ids.next(),
        sellerId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        price: somToTiyin(dto.price),
        deliveryDays: dto.deliveryDays,
      },
    });
  }

  async listMine(sellerId: string, page: number, perPage: number): Promise<Page<Service>> {
    const where = { sellerId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.service.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  /** Egalik — QUERY-SCOPE'DA (`WHERE id AND sellerId`), keyin JS solishtirish EMAS.
   * Boshqa userning ID'si mavjudligini ham leak qilmaslik uchun — har doim `SERVICE_NOT_FOUND`. */
  async getOwnedOrThrow(id: string, sellerId: string): Promise<Service> {
    const service = await this.prisma.service.findFirst({ where: { id, sellerId } });
    if (!service) throw new NotFoundError('Xizmat topilmadi', 'SERVICE_NOT_FOUND');
    return service;
  }

  async update(id: string, sellerId: string, dto: UpdateServiceDto): Promise<Service> {
    const existing = await this.getOwnedOrThrow(id, sellerId);
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new DomainError('INVALID_TRANSITION', 'Bu holatdagi xizmatni tahrirlab bo‘lmaydi');
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundError('Kategoriya topilmadi', 'CATEGORY_NOT_FOUND');
      if (category.status !== 'ACTIVE') {
        throw new DomainError('CATEGORY_DISABLED', 'Bu kategoriya faol emas');
      }
    }

    const data: Prisma.ServiceUpdateInput = {
      category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
      title: dto.title,
      description: dto.description,
      price: dto.price !== undefined ? somToTiyin(dto.price) : undefined,
      deliveryDays: dto.deliveryDays,
    };
    // REJECTED -> DRAFT: tahrirlash "qayta ishlayapman" degani (spec jadvali).
    if (existing.status === 'REJECTED') {
      data.status = 'DRAFT';
      data.rejectionReason = null;
    }

    return this.prisma.service.update({ where: { id: existing.id }, data });
  }

  async submit(id: string, sellerId: string): Promise<Service> {
    await this.getOwnedOrThrow(id, sellerId);
    const cas = await this.prisma.service.updateMany({
      where: { id, sellerId, status: 'DRAFT' },
      data: { status: 'PENDING_REVIEW', submittedAt: new Date() },
    });
    if (cas.count === 0) throw new DomainError('INVALID_TRANSITION', 'Faqat qoralamani ko‘rib chiqishga yuborish mumkin');
    return this.prisma.service.findUniqueOrThrow({ where: { id } });
  }

  async pause(id: string, sellerId: string): Promise<Service> {
    await this.getOwnedOrThrow(id, sellerId);
    const cas = await this.prisma.service.updateMany({
      where: { id, sellerId, status: 'ACTIVE' },
      data: { status: 'PAUSED' },
    });
    if (cas.count === 0) throw new DomainError('INVALID_TRANSITION', 'Faqat faol xizmatni to‘xtatish mumkin');
    return this.prisma.service.findUniqueOrThrow({ where: { id } });
  }

  async resume(id: string, sellerId: string): Promise<Service> {
    await this.getOwnedOrThrow(id, sellerId);
    const cas = await this.prisma.service.updateMany({
      where: { id, sellerId, status: 'PAUSED' },
      data: { status: 'ACTIVE' },
    });
    if (cas.count === 0) throw new DomainError('INVALID_TRANSITION', 'Faqat to‘xtatilgan xizmatni tiklash mumkin');
    return this.prisma.service.findUniqueOrThrow({ where: { id } });
  }

  async archive(id: string, sellerId: string): Promise<Service> {
    const existing = await this.getOwnedOrThrow(id, sellerId);
    if (!ARCHIVABLE_STATUSES.includes(existing.status)) {
      throw new DomainError('INVALID_TRANSITION', 'Bu holatdagi xizmatni arxivlab bo‘lmaydi');
    }
    const cas = await this.prisma.service.updateMany({
      where: { id, sellerId, status: { in: ARCHIVABLE_STATUSES } },
      data: { status: 'ARCHIVED' },
    });
    if (cas.count === 0) throw new DomainError('INVALID_TRANSITION', 'Bu holatdagi xizmatni arxivlab bo‘lmaydi');
    return this.prisma.service.findUniqueOrThrow({ where: { id } });
  }

  // ── Staff moderatsiyasi ──────────────────────────────────────────────

  async listForStaff(
    page: number,
    perPage: number,
    status?: Service['status'],
  ): Promise<Page<Service>> {
    const where = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.service.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  async getByIdOrThrow(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundError('Xizmat topilmadi', 'SERVICE_NOT_FOUND');
    return service;
  }

  async approve(id: string, actor: AuditActor): Promise<Service> {
    const existing = await this.getByIdOrThrow(id);
    const result = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.service.updateMany({
        where: { id, status: 'PENDING_REVIEW' },
        data: {
          status: 'ACTIVE',
          reviewedAt: new Date(),
          reviewedByStaffId: actor.id,
          publishedAt: existing.publishedAt ?? new Date(),
          rejectionReason: null,
        },
      });
      if (cas.count === 0) return null;

      await this.audit.record(
        {
          actor,
          action: 'SERVICE_APPROVED',
          resourceType: 'SERVICE',
          resourceId: id,
          contextId: existing.sellerId,
          previousState: { status: 'PENDING_REVIEW' },
          newState: { status: 'ACTIVE' },
        },
        tx,
      );
      await this.outbox.enqueue(
        {
          aggregateType: 'SERVICE',
          aggregateId: id,
          eventType: 'SERVICE_APPROVED',
          payload: { sellerId: existing.sellerId },
        },
        tx,
      );
      return tx.service.findUniqueOrThrow({ where: { id } });
    });

    if (!result) throw new DomainError('INVALID_TRANSITION', 'Bu xizmat ko‘rib chiqish navbatida emas');
    return result;
  }

  async reject(id: string, reason: string, actor: AuditActor): Promise<Service> {
    const existing = await this.getByIdOrThrow(id);
    const result = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.service.updateMany({
        where: { id, status: 'PENDING_REVIEW' },
        data: { status: 'REJECTED', reviewedAt: new Date(), reviewedByStaffId: actor.id, rejectionReason: reason },
      });
      if (cas.count === 0) return null;

      await this.audit.record(
        {
          actor,
          action: 'SERVICE_REJECTED',
          resourceType: 'SERVICE',
          resourceId: id,
          contextId: existing.sellerId,
          previousState: { status: 'PENDING_REVIEW' },
          newState: { status: 'REJECTED', reason },
        },
        tx,
      );
      await this.outbox.enqueue(
        {
          aggregateType: 'SERVICE',
          aggregateId: id,
          eventType: 'SERVICE_REJECTED',
          payload: { sellerId: existing.sellerId, reason },
        },
        tx,
      );
      return tx.service.findUniqueOrThrow({ where: { id } });
    });

    if (!result) throw new DomainError('INVALID_TRANSITION', 'Bu xizmat ko‘rib chiqish navbatida emas');
    return result;
  }

  // ── Public ────────────────────────────────────────────────────────────

  async listPublic(query: ListServicesQueryDto): Promise<Page<Service>> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;

    const where: Prisma.ServiceWhereInput = { status: 'ACTIVE' };
    if (query.category) {
      const category = await this.prisma.category.findUnique({ where: { slug: query.category } });
      // Noma'lum slug — bo'sh natija (404 EMAS, bu qidiruv filtri).
      if (!category) return buildPage([], 0, page, perPage);
      where.categoryId = category.id;
    }
    if (query.seller) where.sellerId = query.seller;
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      where.price = {
        gte: query.priceMin !== undefined ? somToTiyin(query.priceMin) : undefined,
        lte: query.priceMax !== undefined ? somToTiyin(query.priceMax) : undefined,
      };
    }
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: Prisma.ServiceOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({ where, orderBy, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.service.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  /** Faqat `ACTIVE` — boshqa holat 404 (mavjudligini ham leak qilmaslik uchun). */
  async getPublicOrThrow(id: string): Promise<Service> {
    const service = await this.prisma.service.findFirst({ where: { id, status: 'ACTIVE' } });
    if (!service) throw new NotFoundError('Xizmat topilmadi', 'SERVICE_NOT_FOUND');
    return service;
  }
}
