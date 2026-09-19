import { Injectable } from '@nestjs/common';
import { Prisma, type Category } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { DomainError, NotFoundError } from '@/common/errors/domain-error';
import { AuditService } from '@/common/audit/audit.service';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { AuditActor } from '@/common/audit/audit.service';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly audit: AuditService,
  ) {}

  /** Public — faqat ACTIVE, `sortOrder` bo'yicha. */
  async listPublic(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
    });
  }

  async listForStaff(
    page: number,
    perPage: number,
    status?: 'ACTIVE' | 'ARCHIVED',
  ): Promise<Page<Category>> {
    const where = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.category.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  async getByIdOrThrow(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError('Kategoriya topilmadi', 'CATEGORY_NOT_FOUND');
    return category;
  }

  async create(dto: CreateCategoryDto, actor: AuditActor): Promise<Category> {
    try {
      const category = await this.prisma.category.create({
        data: {
          id: this.ids.next(),
          slug: dto.slug,
          nameUz: dto.nameUz,
          nameRu: dto.nameRu,
          nameEn: dto.nameEn,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await this.audit.record({
        actor,
        action: 'CATEGORY_CREATED',
        resourceType: 'CATEGORY',
        resourceId: category.id,
        newState: { slug: category.slug, nameUz: category.nameUz },
      });
      return category;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        throw new DomainError('CATEGORY_SLUG_EXISTS', 'Bu slug band');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.getByIdOrThrow(id);
    return this.prisma.category.update({
      where: { id: existing.id },
      data: {
        nameUz: dto.nameUz ?? undefined,
        nameRu: dto.nameRu ?? undefined,
        nameEn: dto.nameEn ?? undefined,
        sortOrder: dto.sortOrder ?? undefined,
      },
    });
  }

  /** Hard delete YO'Q — referential integrity (mavjud `Service.categoryId`) buzilmasin. */
  async archive(id: string, actor: AuditActor): Promise<Category> {
    const existing = await this.getByIdOrThrow(id);
    const updated = await this.prisma.category.update({
      where: { id: existing.id },
      data: { status: 'ARCHIVED' },
    });
    await this.audit.record({
      actor,
      action: 'CATEGORY_ARCHIVED',
      resourceType: 'CATEGORY',
      resourceId: id,
      previousState: { status: existing.status },
      newState: { status: 'ARCHIVED' },
    });
    return updated;
  }

  async activate(id: string, actor: AuditActor): Promise<Category> {
    const existing = await this.getByIdOrThrow(id);
    const updated = await this.prisma.category.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE' },
    });
    await this.audit.record({
      actor,
      action: 'CATEGORY_ACTIVATED',
      resourceType: 'CATEGORY',
      resourceId: id,
      previousState: { status: existing.status },
      newState: { status: 'ACTIVE' },
    });
    return updated;
  }
}
