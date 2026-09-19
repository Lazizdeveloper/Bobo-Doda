import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { OutboxWorkerService } from './outbox-worker.service';
import { OUTBOX_QUEUE } from './notification.constants';

/**
 * Bo'lim 34/68/69 — Phase 9'ning `ReconciliationProcessor`si bilan BIR XIL
 * naqsh, lekin ALOHIDA navbat/job (`OUTBOX_QUEUE` — `reconciliation`dan
 * FARQLI nom, ikkalasi bir-birini buzmaydi). BullMQ shu yerda faqat
 * "uyg'otish" signali — DB (`OutboxEvent`) authoritative: Redis navbati
 * yo'qolsa (bo'lim 35/71) ham sweeper keyingi tsiklda qatorlarni qayta
 * topadi, HECH NARSA yo'qolmaydi.
 */
@Injectable()
@Processor(OUTBOX_QUEUE)
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(private readonly outboxWorker: OutboxWorkerService) {
    super();
  }

  async process(job: Job): Promise<void> {
    const stats = await this.outboxWorker.runBatch();
    this.logger.log(
      {
        jobId: job.id,
        outbox_pending_claimed: stats.claimed,
        outbox_delivery_success_total: stats.delivered,
        outbox_delivery_failure_total: stats.retryScheduled,
        outbox_dead_count: stats.dead,
        outbox_skipped_count: stats.skipped,
      },
      'Outbox delivery batch yakunlandi',
    );
  }
}
