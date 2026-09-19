import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { SmsModule } from '@/infra/sms/sms.module';
import { OUTBOX_QUEUE } from './notification.constants';
import { RecipientResolverService } from './recipient-resolver.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { OutboxProcessor } from './outbox.processor';
import { OutboxSchedulerService } from './outbox-scheduler.service';
import { StaffOutboxController } from './staff-outbox.controller';

/**
 * Bosqich 10 — `SmsModule`ni import qiladi (`SMS_PROVIDER` eksporti uchun,
 * OTP bilan BIR XIL provider instansiyasi — bo'lim 12). `LedgerModule`
 * kabi domen ma'lumot modullariga BOG'LIQ EMAS: recipient resolution
 * to'g'ridan-to'g'ri `PrismaService` (global) orqali, alohida domen
 * servisi chaqirilmaydi (bo'lim 50 — "keraksiz complexity kiritma").
 */
@Module({
  imports: [StaffAuthModule, SmsModule, BullModule.registerQueue({ name: OUTBOX_QUEUE })],
  controllers: [StaffOutboxController],
  providers: [RecipientResolverService, OutboxWorkerService, OutboxProcessor, OutboxSchedulerService],
  exports: [OutboxWorkerService],
})
export class NotificationModule {}
