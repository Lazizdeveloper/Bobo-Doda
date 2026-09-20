import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { AppConfigService } from '@/config/app-config.service';
import { OUTBOX_QUEUE, OUTBOX_SWEEP_JOB_ID, OUTBOX_SWEEP_JOB_NAME } from './notification.constants';

/**
 * Bo'lim 67 — periodic sweeper: BullMQ repeatable job orqali. Bo'lim 37 —
 * worker SINGLETON EMAS: barqaror `jobId` orqali BullMQ o'zi replikalar
 * orasida dublikat rejalashtirishni oldini oladi (Phase 9's
 * `ReconciliationSchedulerService` bilan BIR XIL naqsh).
 *
 * `config.isTest` bo'lsa RO'YXATDAN O'TKAZILMAYDI — bo'lim 44/76: e2e
 * testlar `OutboxWorkerService.runBatch()`ni to'g'ridan-to'g'ri chaqiradi,
 * fon jarayoniga (va umumiy `SMS_PROVIDER` test-double holatiga —
 * boshqa testlarning OTP capture'iga aralashmasin) bog'liq emas.
 */
@Injectable()
export class OutboxSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OutboxSchedulerService.name);

  constructor(
    @InjectQueue(OUTBOX_QUEUE) private readonly queue: Queue,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.isTest) return;
    await this.queue.add(
      OUTBOX_SWEEP_JOB_NAME,
      {},
      {
        jobId: OUTBOX_SWEEP_JOB_ID,
        repeat: { every: this.config.outbox.sweepIntervalSeconds * 1000 },
      },
    );
    this.logger.log({ sweepIntervalSeconds: this.config.outbox.sweepIntervalSeconds }, 'Outbox sweep repeatable job ro‘yxatdan o‘tkazildi');
  }
}
