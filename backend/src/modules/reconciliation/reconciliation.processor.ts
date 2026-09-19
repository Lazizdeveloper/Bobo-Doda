import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ReconciliationService } from './reconciliation.service';
import { AnomalyService } from './anomaly.service';
import { RECONCILIATION_QUEUE } from './reconciliation.constants';

/**
 * Bo'lim 16/76 — rejalashtirilgan (repeatable) job shu yerda ISHLAYDI.
 * `ReconciliationScheduler` faqat job'ni QATORGA QO'YADI (bo'lim 52 —
 * BullMQ repeat+jobId orqali replica'lar orasida avto-dedup), aslida
 * batch'ni yurgizish ATAYLAB shu alohida `WorkerHost`da — outbox worker
 * (Phase 10, hali yo'q) bilan ARALASHTIRILMAYDI (alohida navbat, alohida processor).
 *
 * Bo'lim 56 — kuzatuv: og'ir metrikalar stack'i (Prometheus va h.k.) QO'SHILMAYDI,
 * o'rniga har batch'dan keyin ANIQ nomlangan sanoqlar bitta strukturaviy log
 * qatoriga yoziladi — mavjud Pino logger, `jobId` bilan bog'langan holda.
 */
@Injectable()
@Processor(RECONCILIATION_QUEUE)
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly anomalies: AnomalyService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const result = await this.reconciliation.runBatch('AUTOMATIC');
    const [stuck, anomalySummary] = await Promise.all([this.reconciliation.countStuck(), this.anomalies.summary()]);
    this.logger.log(
      {
        jobId: job.id,
        reconciliationRunId: job.id,
        stuck_payments_count: stuck.payments,
        stuck_refunds_count: stuck.refunds,
        stuck_payouts_count: stuck.payouts,
        reconciliation_success_total: result.reconciled,
        reconciliation_failure_total: result.errors,
        financial_anomalies_total: anomalySummary.unresolved,
        ...result,
      },
      'Reconciliation batch yakunlandi',
    );
  }
}
