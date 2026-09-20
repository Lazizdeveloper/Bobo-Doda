import { Injectable } from '@nestjs/common';
import type { FinancialAnomalySeverity } from '@prisma/client';
import { LedgerIntegrityService } from '@/modules/ledger/ledger-integrity.service';
import { AnomalyService } from './anomaly.service';
import { ANOMALY_CODES, type AnomalyCode } from './anomaly-codes.constant';

export interface FinancialIntegrityScanResult {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

/**
 * Bo'lim 21/48/51 — `LedgerIntegrityService`ning SOF query metodlarini
 * (Bosqich 6/7/8/9) o'qib, natijalarni `FinancialAnomaly` sifatida yozadi.
 * `LedgerIntegrityService`ning o'zi `AnomalyService`ga BOG'LIQ EMAS (u
 * `LedgerModule`da, `@Global()` — bog'liqlik yo'nalishi shu servisga
 * qaratilgan, aksincha emas) — bu ORQALI ikkinchi "accounting model"
 * YARATILMAYDI, faqat MAVJUD tekshiruvlar bitta joyda yig'ilib anomaliyaga
 * aylantiriladi. `/health/ready`da HECH QACHON chaqirilmaydi (og'ir scan);
 * faqat CLI (`npm run financial:check`) va `GET /staff/financial-integrity`
 * shu servisni ishlatadi.
 */
@Injectable()
export class FinancialIntegrityService {
  constructor(
    private readonly ledgerIntegrity: LedgerIntegrityService,
    private readonly anomalies: AnomalyService,
  ) {}

  async scan(): Promise<FinancialIntegrityScanResult> {
    const counts: Record<FinancialAnomalySeverity, number> = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    const raise = async (
      code: AnomalyCode,
      severity: FinancialAnomalySeverity,
      entityType: string,
      entityId: string,
      description: string,
    ) => {
      await this.anomalies.raise({ code, severity, entityType, entityId, description });
      counts[severity] += 1;
    };

    for (const row of await this.ledgerIntegrity.findUnfundedSucceededPayments()) {
      await raise(
        ANOMALY_CODES.SUCCEEDED_PAYMENT_WITHOUT_FUNDING,
        'CRITICAL',
        'PAYMENT',
        row.paymentId,
        `Payment ${row.paymentId} SUCCEEDED, lekin PAYMENT_FUNDING journal yo'q (contract ${row.contractId})`,
      );
    }

    for (const row of await this.ledgerIntegrity.findFundingJournalsWithoutSucceededPayment()) {
      await raise(
        ANOMALY_CODES.FUNDING_WITHOUT_SUCCEEDED_PAYMENT,
        'CRITICAL',
        'PAYMENT',
        row.paymentId,
        `Payment ${row.paymentId}: PAYMENT_FUNDING journal bor, lekin status ${row.status} (SUCCEEDED emas)`,
      );
    }

    for (const row of await this.ledgerIntegrity.findUnsettledCompletedContracts()) {
      await raise(
        ANOMALY_CODES.COMPLETED_CONTRACT_WITHOUT_SETTLEMENT,
        'CRITICAL',
        'CONTRACT',
        row.contractId,
        `Contract ${row.contractId} COMPLETED, lekin CONTRACT_SETTLEMENT journal yo'q`,
      );
    }

    for (const row of await this.ledgerIntegrity.findUnjournaledSucceededRefunds()) {
      await raise(
        ANOMALY_CODES.SUCCEEDED_REFUND_WITHOUT_JOURNAL,
        'CRITICAL',
        'REFUND',
        row.refundId,
        `Refund ${row.refundId} SUCCEEDED, lekin REFUND journal yo'q (contract ${row.contractId})`,
      );
    }

    for (const row of await this.ledgerIntegrity.findFailedPayoutsMissingRelease()) {
      await raise(
        ANOMALY_CODES.FAILED_PAYOUT_MISSING_RELEASE,
        'CRITICAL',
        'PAYOUT',
        row.payoutId,
        `Payout ${row.payoutId} FAILED, lekin PAYOUT_RELEASE yo'q — mablag' PAYOUT_CLEARING'da qotib qolgan bo'lishi mumkin (seller ${row.sellerId})`,
      );
    }

    for (const row of await this.ledgerIntegrity.findSucceededPayoutsWithoutReservation()) {
      await raise(
        ANOMALY_CODES.SUCCEEDED_PAYOUT_WITHOUT_RESERVATION,
        'CRITICAL',
        'PAYOUT',
        row.payoutId,
        `Payout ${row.payoutId} SUCCEEDED, lekin PAYOUT_RESERVATION journal yo'q (seller ${row.sellerId})`,
      );
    }

    for (const row of await this.ledgerIntegrity.findUnbalancedTransactions()) {
      await raise(
        ANOMALY_CODES.UNBALANCED_LEDGER_TRANSACTION,
        'CRITICAL',
        'LEDGER_TRANSACTION',
        row.transactionId,
        `Ledger transaction ${row.transactionId}: yozuvlar yig'indisi ${row.sum} (0 bo'lishi shart)`,
      );
    }

    for (const row of await this.ledgerIntegrity.findNegativeUserAccountBalances()) {
      await raise(
        ANOMALY_CODES.NEGATIVE_USER_ACCOUNT_BALANCE,
        'CRITICAL',
        'LEDGER_ACCOUNT',
        row.accountId,
        `Ledger account ${row.accountId} (${row.type}, owner ${row.ownerId}) balansi manfiy: ${row.balance}`,
      );
    }

    // ── Bosqich 8 — dispute integrity (bo'lim 21: mavjud tekshiruvlar qayta ishlatiladi) ──
    for (const row of await this.ledgerIntegrity.findPostSettlementDisputesWithoutHold()) {
      await raise(
        ANOMALY_CODES.DISPUTE_POST_SETTLEMENT_WITHOUT_HOLD,
        'CRITICAL',
        'DISPUTE',
        row.disputeId,
        `Dispute ${row.disputeId} post-settlement, lekin DISPUTE_HOLD journal yo'q (contract ${row.contractId})`,
      );
    }
    for (const row of await this.ledgerIntegrity.findResolvedDisputesWithMissingSellerJournal()) {
      await raise(
        ANOMALY_CODES.DISPUTE_RESOLVED_WITHOUT_SELLER_JOURNAL,
        'CRITICAL',
        'DISPUTE',
        row.disputeId,
        `Dispute ${row.disputeId} RESOLVED (sellerAward > 0), lekin DISPUTE_RESOLUTION journal yo'q`,
      );
    }
    for (const row of await this.ledgerIntegrity.findResolvedDisputesWithMissingRefund()) {
      await raise(
        ANOMALY_CODES.DISPUTE_RESOLVED_WITHOUT_REFUND,
        'CRITICAL',
        'DISPUTE',
        row.disputeId,
        `Dispute ${row.disputeId} RESOLVED (buyerAward > 0), lekin bog'langan Refund yo'q`,
      );
    }
    for (const row of await this.ledgerIntegrity.findDisputeRefundAmountMismatches()) {
      await raise(
        ANOMALY_CODES.DISPUTE_REFUND_AMOUNT_MISMATCH,
        'CRITICAL',
        'REFUND',
        row.refundId,
        `Refund ${row.refundId}: summa Dispute ${row.disputeId}.buyerAwardAmount bilan mos emas`,
      );
    }

    return { critical: counts.CRITICAL, warning: counts.WARNING, info: counts.INFO, total: counts.CRITICAL + counts.WARNING + counts.INFO };
  }
}
