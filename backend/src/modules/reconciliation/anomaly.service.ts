import { Injectable } from '@nestjs/common';
import { Prisma, type FinancialAnomaly, type FinancialAnomalySeverity } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';
import { NotFoundError } from '@/common/errors/domain-error';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';
import type { AnomalyCode } from './anomaly-codes.constant';

export interface RaiseAnomalyInput {
  code: AnomalyCode;
  severity: FinancialAnomalySeverity;
  entityType: string;
  entityId: string;
  description: string;
}

/**
 * Bo'lim 22/27 — anomaliya YARATADI, HECH QACHON financial ma'lumotni
 * TUZATMAYDI ("detect + escalate", bo'lim 28's default). `@@unique([code,
 * entityType, entityId])` orqali bir xil muammo qayta-qayta scan qilinsa
 * ham DUPLIKAT qator YO'Q (`skipDuplicates` — `upsert()` EMAS, Bosqich
 * 6/7'dagi "UPDATE huquqi kerak bo'lmasin" saboqi bilan bir xil ruhda,
 * garchi bu jadval append-only bo'lmasa ham — oddiy INSERT-yoki-hech-narsa
 * yetarli).
 */
@Injectable()
export class AnomalyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly audit: AuditService,
  ) {}

  /** `tx` — chaqiruvchi (masalan `ReconciliationService`) allaqachon ochgan tranzaksiya bo'lishi mumkin. */
  async raise(input: RaiseAnomalyInput, tx: Pick<PrismaService, 'financialAnomaly'> = this.prisma): Promise<void> {
    await tx.financialAnomaly.createMany({
      data: [
        {
          id: this.ids.next(),
          code: input.code,
          severity: input.severity,
          entityType: input.entityType,
          entityId: input.entityId,
          description: input.description,
        },
      ],
      skipDuplicates: true,
    });
  }

  async list(
    filters: { code?: string; severity?: FinancialAnomalySeverity; entityType?: string; resolved?: boolean; since?: Date },
    page: number,
    perPage: number,
  ): Promise<Page<FinancialAnomaly>> {
    const where: Prisma.FinancialAnomalyWhereInput = {
      code: filters.code,
      severity: filters.severity,
      entityType: filters.entityType,
      detectedAt: filters.since ? { gte: filters.since } : undefined,
      resolvedAt: filters.resolved === undefined ? undefined : filters.resolved ? { not: null } : null,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.financialAnomaly.findMany({ where, orderBy: { detectedAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.financialAnomaly.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  async summary(): Promise<{ total: number; bySeverity: Record<FinancialAnomalySeverity, number>; unresolved: number }> {
    const [total, unresolved, grouped] = await Promise.all([
      this.prisma.financialAnomaly.count(),
      this.prisma.financialAnomaly.count({ where: { resolvedAt: null } }),
      this.prisma.financialAnomaly.groupBy({ by: ['severity'], where: { resolvedAt: null }, _count: { _all: true } }),
    ]);
    const bySeverity: Record<FinancialAnomalySeverity, number> = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    for (const row of grouped) bySeverity[row.severity] = row._count._all;
    return { total, unresolved, bySeverity };
  }

  /** Bo'lim: staff "ko'rib chiqildi" deb belgilaydi — HECH QANDAY moliyaviy maydonga tegmaydi. */
  async acknowledge(id: string, actor: AuditActor, note: string | undefined): Promise<FinancialAnomaly> {
    const existing = await this.prisma.financialAnomaly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Anomaliya topilmadi', 'NOT_FOUND');
    const updated = await this.prisma.financialAnomaly.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedByStaffId: actor.id, resolutionNote: note },
    });
    await this.audit.record({
      actor,
      action: 'FINANCIAL_ANOMALY_ACKNOWLEDGED',
      resourceType: 'FINANCIAL_ANOMALY',
      resourceId: id,
      previousState: { resolvedAt: existing.resolvedAt?.toISOString() ?? null },
      newState: { resolvedAt: updated.resolvedAt?.toISOString() ?? null, note: note ?? null },
    });
    return updated;
  }

  async getByIdOrThrow(id: string): Promise<FinancialAnomaly> {
    const anomaly = await this.prisma.financialAnomaly.findUnique({ where: { id } });
    if (!anomaly) throw new NotFoundError('Anomaliya topilmadi', 'NOT_FOUND');
    return anomaly;
  }
}
