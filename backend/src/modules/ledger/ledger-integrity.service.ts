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

  // ── Bosqich 8 — dispute reconciliation (bo'lim 67) ────────────────────

  /** Post-settlement Dispute, `heldAmount > 0`, lekin `DISPUTE_HOLD` journal YO'Q. */
  async findPostSettlementDisputesWithoutHold(): Promise<{ disputeId: string; contractId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; contractId: string }[]>`
      SELECT d.id, d."contractId"
      FROM disputes d
      WHERE d."preSettlement" = false AND d."heldAmount" > 0
        AND NOT EXISTS (
          SELECT 1 FROM ledger_transactions lt
          WHERE lt.type = 'DISPUTE_HOLD' AND lt."sourceId" = d.id::text
        )
    `;
    return rows.map((r) => ({ disputeId: r.id, contractId: r.contractId }));
  }

  /** RESOLVED Dispute, `sellerAwardAmount > 0`, lekin `DISPUTE_RESOLUTION` journal YO'Q. */
  async findResolvedDisputesWithMissingSellerJournal(): Promise<{ disputeId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT d.id
      FROM disputes d
      WHERE d.status = 'RESOLVED' AND d."sellerAwardAmount" > 0
        AND NOT EXISTS (
          SELECT 1 FROM ledger_transactions lt
          WHERE lt.type = 'DISPUTE_RESOLUTION' AND lt."sourceId" = d.id::text
        )
    `;
    return rows.map((r) => ({ disputeId: r.id }));
  }

  /** RESOLVED Dispute, `buyerAwardAmount > 0`, lekin `disputeId` bilan bog'langan Refund YO'Q. */
  async findResolvedDisputesWithMissingRefund(): Promise<{ disputeId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT d.id
      FROM disputes d
      WHERE d.status = 'RESOLVED' AND d."buyerAwardAmount" > 0
        AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r."disputeId" = d.id)
    `;
    return rows.map((r) => ({ disputeId: r.id }));
  }

  /** Dispute-driven Refund, `amount` `Dispute.buyerAwardAmount`dan FARQ qiladi (bo'lim 67). */
  async findDisputeRefundAmountMismatches(): Promise<{ refundId: string; disputeId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; disputeId: string }[]>`
      SELECT r.id, r."disputeId"
      FROM refunds r
      JOIN disputes d ON d.id = r."disputeId"
      WHERE r."disputeId" IS NOT NULL AND r.amount <> d."buyerAwardAmount"
    `;
    return rows.map((r) => ({ refundId: r.id, disputeId: r.disputeId }));
  }

  /** `SELLER_PAYABLE` (yoki boshqa foydalanuvchi hisobi) balansi manfiy — HECH QACHON bo'lmasligi kerak. */
  async findNegativeUserAccountBalances(): Promise<{ accountId: string; type: string; ownerId: string; balance: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; type: string; ownerId: string; balance: bigint }[]>`
      SELECT la.id, la.type, la."ownerId", COALESCE(SUM(le.amount), 0) AS balance
      FROM ledger_accounts la
      LEFT JOIN ledger_entries le ON le."accountId" = la.id
      WHERE la."ownerType" = 'USER'
      GROUP BY la.id, la.type, la."ownerId"
      HAVING COALESCE(SUM(le.amount), 0) < 0
    `;
    return rows.map((r) => ({ accountId: r.id, type: r.type, ownerId: r.ownerId, balance: r.balance.toString() }));
  }

  // ── Bosqich 9, bo'lim 21 — reconciliation integratsiyasi ────────────────

  /** `PAYMENT_FUNDING` journal bor, lekin Payment `SUCCEEDED` EMAS — struktura buzilishi (bo'lim 21). */
  async findFundingJournalsWithoutSucceededPayment(): Promise<{ paymentId: string; status: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; status: string }[]>`
      SELECT p.id, p.status
      FROM ledger_transactions lt
      JOIN payments p ON p.id::text = lt."sourceId"
      WHERE lt.type = 'PAYMENT_FUNDING' AND p.status <> 'SUCCEEDED'
    `;
    return rows.map((r) => ({ paymentId: r.id, status: r.status }));
  }

  /**
   * `SUCCEEDED` Refund, lekin `REFUND` journal YO'Q. Dispute-driven refund
   * (`disputeId` bor) ATAYLAB CHIQARIB TASHLANADI — u `REFUND` turida EMAS,
   * `DISPUTE_RESOLUTION`da hisoblanadi (Bosqich 8'ning o'z tekshiruvlari —
   * `findResolvedDisputesWithMissingRefund` — buni allaqachon qamrab oladi).
   */
  async findUnjournaledSucceededRefunds(): Promise<{ refundId: string; contractId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; contractId: string }[]>`
      SELECT r.id, r."contractId"
      FROM refunds r
      WHERE r.status = 'SUCCEEDED' AND r."disputeId" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ledger_transactions lt
          WHERE lt.type = 'REFUND' AND lt."sourceId" = r.id::text
        )
    `;
    return rows.map((r) => ({ refundId: r.id, contractId: r.contractId }));
  }

  /** `FAILED` Payout, rezervatsiya BOR, lekin `PAYOUT_RELEASE` YO'Q — mablag' `PAYOUT_CLEARING`da "qotib" qolgan bo'lishi mumkin. */
  async findFailedPayoutsMissingRelease(): Promise<{ payoutId: string; sellerId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; sellerId: string }[]>`
      SELECT p.id, p."sellerId"
      FROM payouts p
      WHERE p.status = 'FAILED'
        AND EXISTS (SELECT 1 FROM ledger_transactions lt WHERE lt.type = 'PAYOUT_RESERVATION' AND lt."sourceId" = p.id::text)
        AND NOT EXISTS (SELECT 1 FROM ledger_transactions lt WHERE lt.type = 'PAYOUT_RELEASE' AND lt."sourceId" = p.id::text)
    `;
    return rows.map((r) => ({ payoutId: r.id, sellerId: r.sellerId }));
  }

  /** `SUCCEEDED` Payout, lekin `PAYOUT_RESERVATION` journal YO'Q — struktura buzilishi (rezervatsiya HAR DOIM yaratilish paytida yoziladi). */
  async findSucceededPayoutsWithoutReservation(): Promise<{ payoutId: string; sellerId: string }[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; sellerId: string }[]>`
      SELECT p.id, p."sellerId"
      FROM payouts p
      WHERE p.status = 'SUCCEEDED'
        AND NOT EXISTS (SELECT 1 FROM ledger_transactions lt WHERE lt.type = 'PAYOUT_RESERVATION' AND lt."sourceId" = p.id::text)
    `;
    return rows.map((r) => ({ payoutId: r.id, sellerId: r.sellerId }));
  }
}
