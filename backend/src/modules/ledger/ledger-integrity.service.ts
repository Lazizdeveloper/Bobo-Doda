import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';

/**
 * Bo'lim 48/63/64 — production health endpointga OG'IR query qo'shilmaydi
 * (bu servis HTTP orqali chaqirilmaydi) — CLI/admin diagnostika uchun
 * mo'ljallangan (`RUNBOOK.md`da qanday ishlatish tushuntirilgan).
 *
 * Ikkinchi vazifasi — **historical backfill aniqlash** (bo'lim 63/64):
 * Phase 6 migratsiyasidan OLDIN yozilgan `SUCCEEDED` Payment/`COMPLETED`
 * Contract qatorlari (agar bo'lsa) ledger funding/settlement journal'iga
 * ega bo'lmaydi — bu metodlar aynan shu holatlarni topadi.
 */
@Injectable()
export class LedgerIntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  /** `SUCCEEDED` Payment, lekin `PAYMENT_FUNDING` journal YO'Q. */
  async findUnfundedSucceededPayments(): Promise<{ paymentId: string; contractId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; contractId: string }[]>`
      SELECT p.id, p."contractId"
      FROM payments p
      WHERE p.status = 'SUCCEEDED'
        AND NOT EXISTS (
          SELECT 1 FROM ledger_transactions lt
          WHERE lt.type = 'PAYMENT_FUNDING' AND lt."sourceId" = p.id::text
        )
    `;
    return rows.map((r) => ({ paymentId: r.id, contractId: r.contractId }));
  }

  /** `COMPLETED` Contract, lekin `CONTRACT_SETTLEMENT` journal YO'Q. */
  async findUnsettledCompletedContracts(): Promise<{ contractId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT c.id
      FROM contracts c
      WHERE c.status = 'COMPLETED'
        AND NOT EXISTS (
          SELECT 1 FROM ledger_transactions lt
          WHERE lt.type = 'CONTRACT_SETTLEMENT' AND lt."sourceId" = c.id::text
        )
    `;
    return rows.map((r) => ({ contractId: r.id }));
  }

  /**
   * Mustaqil tekshiruv — DB deferred trigger allaqachon COMMIT vaqtida
   * buni oldini oladi (bo'lim 21), lekin bu metod trigger o'zi ishlab
   * turganini TASHQARIDAN tasdiqlaydi (masalan trigger keyinchalik
   * qasddan/tasodifan olib tashlansa shu yerda ko'rinadi).
   */
  async findUnbalancedTransactions(): Promise<{ transactionId: string; sum: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; sum: bigint }[]>`
      SELECT lt.id, COALESCE(SUM(le.amount), 0) AS sum
      FROM ledger_transactions lt
      LEFT JOIN ledger_entries le ON le."transactionId" = lt.id
      GROUP BY lt.id
      HAVING COALESCE(SUM(le.amount), 0) <> 0
    `;
    return rows.map((r) => ({ transactionId: r.id, sum: r.sum.toString() }));
  }
}
