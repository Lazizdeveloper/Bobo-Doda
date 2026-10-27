import { Injectable } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { DomainError, ForbiddenError, NotFoundError } from '@/common/errors/domain-error';
import { somToTiyin } from '@/common/money/money.util';
import type { Page } from '@/common/pagination/page-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import type { JobWithRelations } from './dto/job-response.dto';
import type { AuditActor } from '@/common/audit/audit.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
  ) {}

  async create(buyerId: string, dto: CreateJobDto): Promise<JobWithRelations> {
    if (dto.budgetMin < 1_000) {
      throw new DomainError('INVALID_AMOUNT', "Minimal byudjet kamida 1 000 so'm bo'lishi kerak", {
        fieldErrors: { budgetMin: "Minimal byudjet kamida 1 000 so'm bo'lishi kerak" },
      });
    }
    if (dto.budgetMin > dto.budgetMax) {
      throw new DomainError('INVALID_AMOUNT', "Minimal byudjet maksimal byudjetdan katta bo'lishi mumkin emas", {
        fieldErrors: { budgetMin: "Minimal byudjet maksimaldan kam bo'lishi kerak" },
      });
    }

    const isUuid = UUID_REGEX.test(dto.category);
    const category = await this.prisma.category.findFirst({
      where: isUuid ? { OR: [{ id: dto.category }, { slug: dto.category }] } : { slug: dto.category },
    });

    if (!category) {
      throw new DomainError('NOT_FOUND', 'Kategoriya topilmadi', {
        fieldErrors: { category: 'Kategoriya topilmadi' },
      });
    }

    const id = this.ids.next();
    const deadline = dto.deadline ? new Date(dto.deadline) : undefined;
    const parsedDeadline = deadline && !Number.isNaN(deadline.getTime()) ? deadline : undefined;

    const job = await this.prisma.job.create({
      data: {
        id,
        buyerId,
        categoryId: category.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        budgetMin: somToTiyin(dto.budgetMin),
        budgetMax: somToTiyin(dto.budgetMax),
        currency: 'UZS',
        skillsRequired: dto.skillsRequired || [],
        screeningQuestions: dto.screeningQuestions || [],
        proposalsCount: 0,
        status: JobStatus.OPEN,
        deadline: parsedDeadline,
        attachedImages: dto.attachedImages || [],
      },
      include: {
        buyer: { select: { id: true, fullName: true } },
        category: { select: { id: true, slug: true } },
      },
    });

    return job;
  }

  async listPublic(query: ListJobsQueryDto): Promise<Page<JobWithRelations>> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(100, Math.max(1, query.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const where: Prisma.JobWhereInput = {
      status: JobStatus.OPEN,
    };

    if (query.category) {
      const isUuid = UUID_REGEX.test(query.category);
      where.category = isUuid
        ? { OR: [{ id: query.category }, { slug: query.category }] }
        : { slug: query.category };
    }

    if (query.q && query.q.trim()) {
      const search = query.q.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.budgetMin) {
      where.budgetMin = { gte: somToTiyin(query.budgetMin) };
    }
    if (query.budgetMax) {
      where.budgetMax = { lte: somToTiyin(query.budgetMax) };
    }

    const [total, items] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, fullName: true } },
          category: { select: { id: true, slug: true } },
        },
      }),
    ]);

    return {
      items,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage) || 1,
    };
  }

  async listMine(buyerId: string, page = 1, perPage = 50): Promise<Page<JobWithRelations>> {
    const p = Math.max(1, page);
    const pp = Math.min(100, Math.max(1, perPage));
    const skip = (p - 1) * pp;

    const where: Prisma.JobWhereInput = { buyerId };

    const [total, items] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: pp,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, fullName: true } },
          category: { select: { id: true, slug: true } },
        },
      }),
    ]);

    return {
      items,
      page: p,
      perPage: pp,
      total,
      totalPages: Math.ceil(total / pp) || 1,
    };
  }

  async getByIdOrThrow(id: string): Promise<JobWithRelations> {
    const isUuid = UUID_REGEX.test(id);
    if (!isUuid) {
      throw new NotFoundError("E'lon topilmadi");
    }

    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, fullName: true } },
        category: { select: { id: true, slug: true } },
      },
    });

    if (!job) {
      throw new NotFoundError("E'lon topilmadi");
    }

    return job;
  }

  async close(id: string, buyerId: string): Promise<JobWithRelations> {
    const job = await this.getByIdOrThrow(id);

    if (job.buyerId !== buyerId) {
      throw new ForbiddenError("Siz bu e'lonning egasi emassiz");
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.CLOSED },
      include: {
        buyer: { select: { id: true, fullName: true } },
        category: { select: { id: true, slug: true } },
      },
    });

    return updated;
  }

  async listForStaff(query: {
    page?: number;
    perPage?: number;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<Page<JobWithRelations>> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(100, Math.max(1, query.perPage ?? 20));
    const skip = (page - 1) * perPage;

    const where: Prisma.JobWhereInput = {};

    if (query.status && query.status !== "all") {
      const s = query.status.toUpperCase();
      if (s === "OPEN" || s === "OCHIQ") {
        where.status = JobStatus.OPEN;
      } else if (s === "CLOSED" || s === "YOPILGAN") {
        where.status = JobStatus.CLOSED;
      }
    }

    if (query.category && query.category !== "all") {
      const isUuid = UUID_REGEX.test(query.category);
      where.category = isUuid
        ? { OR: [{ id: query.category }, { slug: query.category }] }
        : { slug: query.category };
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { buyer: { fullName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: { select: { id: true, fullName: true } },
          category: { select: { id: true, slug: true } },
        },
      }),
    ]);

    return {
      items,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage) || 1,
    };
  }

  async closeAsAdmin(id: string, reason: string, actor: AuditActor): Promise<JobWithRelations> {
    await this.getByIdOrThrow(id);
    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.CLOSED },
      include: {
        buyer: { select: { id: true, fullName: true } },
        category: { select: { id: true, slug: true } },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          id: this.ids.next(),
          actorType: actor.type,
          actorId: actor.id,
          actorName: actor.name || 'Admin',
          action: "JOB_CLOSED_BY_ADMIN",
          resourceType: "JOB",
          resourceId: id,
          newState: { status: "CLOSED", reason },
        },
      });
    } catch {
      // Audit log creation shouldn't fail the operation
    }

    return updated;
  }
}

