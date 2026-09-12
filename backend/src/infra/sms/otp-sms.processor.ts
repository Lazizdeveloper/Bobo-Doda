import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { SMS_PROVIDER, type SmsProvider } from './sms-provider.interface';

export const OTP_SMS_QUEUE = 'otp-sms';

export interface OtpSmsJobData {
  phone: string;
  code: string;
  template: string;
}

/**
 * OTP SMS yetkazish — ASOSIY OutboxEvent+worker naqshidan ATAYLAB chetga
 * chiqadi: OTP kodi — bir martalik, qisqa umrли SIR. Uni `outbox_events`
 * (Postgres, `SELECT` `bobododa_app`ga OCHIQ, doim saqlanadi) ichiga yozish
 * DB sizib chiqsa tarixiy kodlarni fosh qilardi. BullMQ/Redis job data esa
 * `removeOnComplete`/`removeOnFail` bilan tez tozalanadi (`QueueModule`).
 *
 * Savdo: agar process aynan DB commit bilan navbatga qo'yish orasida
 * qulasa — bitta OTP yuborilmay qoladi (foydalanuvchi shunchaki qayta
 * so'raydi, cooldown tugagach). Bu — ongli tanlov, "hech qachon SIR
 * saqlanmasin" ustuvorroq. Boshqa (parol bo'lmagan) tashqi chaqiruvlar
 * (Telegram, email — Bosqich 6+) standart `OutboxEvent` orqali boradi.
 */
@Injectable()
@Processor(OTP_SMS_QUEUE)
export class OtpSmsProcessor extends WorkerHost {
  private readonly logger = new Logger(OtpSmsProcessor.name);

  constructor(
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
  ) {
    super();
  }

  async process(job: Job<OtpSmsJobData>): Promise<void> {
    const { phone, code, template } = job.data;

    let result: { success: boolean; providerMessageId?: string; errorMessage?: string };
    try {
      result = await this.sms.send(phone, template, { code });
    } catch (err) {
      result = { success: false, errorMessage: err instanceof Error ? err.message : String(err) };
    }

    // SmsLog — HECH QACHON `code` yozilmaydi (faqat kimga/qachon/natija).
    await this.prisma.smsLog.create({
      data: {
        id: this.ids.next(),
        phone,
        template,
        success: result.success,
        providerMessageId: result.providerMessageId,
        errorMessage: result.errorMessage,
      },
    });

    if (!result.success) {
      this.logger.warn({ phone, template, jobId: job.id }, 'SMS yuborilmadi — qayta uriniladi');
      throw new Error(result.errorMessage ?? 'SMS yuborilmadi');
    }
  }
}
