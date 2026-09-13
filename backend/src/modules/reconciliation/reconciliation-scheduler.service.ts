import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { AppConfigService } from '@/config/app-config.service';
import { RECONCILIATION_BATCH_JOB_ID, RECONCILIATION_BATCH_JOB_NAME, RECONCILIATION_QUEUE } from './reconciliation.constants';

/**
 * Bo'lim 16/52 — BullMQ'ning NATIV repeatable-job mexanizmi (yangi
 * bog'liqlik YO'Q — `@nestjs/schedule` qo'shilmadi, chunki BullMQ allaqachon
 * `QueueModule` orqali mavjud). Barqaror `jobId` orqali BullMQ o'zi
 * replika'lar orasida duplicate schedule'ni oldini oladi.
 *
 * `config.isTest` bo'lsa RO'YXATDAN O'TKAZILMAYDI — e2e testlar
 * `ReconciliationService` metodlarini to'g'ridan-to'g'ri chaqiradi
 * (bo'lim 73/76 — determinist test, fon jarayoniga bog'liq emas).
 */
@Injectable()
export class ReconciliationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationSchedulerService.name);

  constructor(
    @InjectQueue(RECONCILIATION_QUEUE) private readonly queue: Queue,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.isTest) return;
    await this.queue.add(
      RECONCILIATION_BATCH_JOB_NAME,
      {},
      {
        jobId: RECONCILIATION_BATCH_JOB_ID,
        repeat: { every: this.config.reconciliation.intervalSeconds * 1000 },
      },
    );
    this.logger.log({ intervalSeconds: this.config.reconciliation.intervalSeconds }, 'Reconciliation repeatable job ro‘yxatdan o‘tkazildi');
  }
}
