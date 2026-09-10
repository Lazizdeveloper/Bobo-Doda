import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@/config/config.module';
import { AppConfigService } from '@/config/app-config.service';

/**
 * BullMQ ulanishi (bitta umumiy Redis connection). Navbatlar va worker'lar o'z
 * bosqichlarida qo'shiladi:
 *  • Bosqich 2 — OTP SMS yuborish.
 *  • Bosqich 4 — escrow avto-qabul (scheduled).
 *  • Bosqich 6 — bildirishnoma offline yetkazish, Outbox worker.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          url: config.redisUrl,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 24 * 3600 },
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
