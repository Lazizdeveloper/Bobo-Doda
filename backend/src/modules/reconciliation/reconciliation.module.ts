import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { RefundModule } from '@/modules/refund/refund.module';
import { PayoutModule } from '@/modules/payout/payout.module';
import { RECONCILIATION_QUEUE } from './reconciliation.constants';
import { AnomalyService } from './anomaly.service';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationProcessor } from './reconciliation.processor';
import { ReconciliationSchedulerService } from './reconciliation-scheduler.service';
import { FinancialIntegrityService } from './financial-integrity.service';
import { StaffReconciliationController } from './staff-reconciliation.controller';
import { StaffFinancialIntegrityController } from './staff-financial-integrity.controller';

/**
 * Bosqich 9 — `PaymentModule`/`RefundModule`/`PayoutModule`ni TO'G'RIDAN-
 * TO'G'RI import qiladi (`RefundModule` orqali TRANZITIV emas — Nest
 * re-export qilmagan provider'ni transitive tarzda ko'rsatmaydi), chunki
 * `PAYMENT_PROVIDER`/`PAYOUT_PROVIDER` faqat ULARNING o'z modulida
 * eksport qilingan. `LedgerModule`/`LedgerIntegrityService` — `@Global()`,
 * alohida import shart emas.
 */
@Module({
  imports: [
    StaffAuthModule,
    PaymentModule,
    RefundModule,
    PayoutModule,
    BullModule.registerQueue({ name: RECONCILIATION_QUEUE }),
  ],
  controllers: [StaffReconciliationController, StaffFinancialIntegrityController],
  providers: [AnomalyService, ReconciliationService, ReconciliationProcessor, ReconciliationSchedulerService, FinancialIntegrityService],
  exports: [ReconciliationService, AnomalyService, FinancialIntegrityService],
})
export class ReconciliationModule {}
