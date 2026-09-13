import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '@/config/app-config.service';
import { ConsoleSmsProvider } from './console-sms.provider';
import { SMS_PROVIDER } from './sms-provider.interface';
import { OtpSmsProcessor, OTP_SMS_QUEUE } from './otp-sms.processor';

/**
 * Real provayderga o'tish — FAQAT shu modulda: quyidagi factory'ga yangi
 * `case` (masalan `EskizProvider`) qo'shiladi. Boshqa hech qayerda
 * `SmsProvider`ga qattiq bog'lanish yo'q.
 *
 * Bosqich 10, bo'lim 19 — `PAYMENT_PROVIDER`/`PAYOUT_PROVIDER` bilan BIR
 * XIL fail-closed qatlam: `SMS_PROVIDER=CONSOLE` production'da IMKONSIZ.
 * OTP HAM, generic Outbox bildirishnoma worker HAM shu BITTA
 * `SMS_PROVIDER` token'ini ishlatadi (bo'lim 12) — production'da real
 * provider ulanmaguncha ikkalasi ham (auth OTP va bildirishnomalar)
 * jimgina "muvaffaqiyatli" ko'rinib, aslida hech kimga yetib bormasligi
 * MUMKIN EMAS: boot umuman bo'lmaydi.
 */
@Module({
  imports: [BullModule.registerQueue({ name: OTP_SMS_QUEUE })],
  providers: [
    {
      provide: SMS_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { provider } = config.sms;
        if (provider === 'CONSOLE') {
          if (config.isProduction) {
            throw new Error("SMS_PROVIDER=CONSOLE production'da ishlatib bo'lmaydi (fail closed)");
          }
          return new ConsoleSmsProvider();
        }
        throw new Error('SMS_PROVIDER: qo‘llab-quvvatlanmaydigan qiymat (hali implement qilinmagan)');
      },
    },
    OtpSmsProcessor,
  ],
  exports: [BullModule, SMS_PROVIDER],
})
export class SmsModule {}
