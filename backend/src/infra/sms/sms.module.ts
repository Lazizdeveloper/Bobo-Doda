import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '@/config/app-config.service';
import { ConsoleSmsProvider } from './console-sms.provider';
import { SMS_PROVIDER } from './sms-provider.interface';
import { OtpSmsProcessor, OTP_SMS_QUEUE } from './otp-sms.processor';
import { PlayMobileProvider } from './providers/playmobile/playmobile.provider';

/**
 * Real provayderga o'tish — FAQAT shu modulda: quyidagi factory'ga yangi
 * `case` qo'shiladi. Boshqa hech qayerda `SmsProvider`ga qattiq bog'lanish
 * yo'q — `OtpService`/`OutboxWorkerService` provayder klassi haqida
 * HECH NARSA bilmaydi (bo'lim 4).
 *
 * Bosqich 10/13, bo'lim 19 — `PAYMENT_PROVIDER`/`PAYOUT_PROVIDER` bilan
 * BIR XIL fail-closed qatlam: `SMS_PROVIDER=CONSOLE` production'da
 * IMKONSIZ. OTP HAM, generic Outbox bildirishnoma worker HAM shu BITTA
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
        if (provider === 'PLAYMOBILE') {
          // Bosqich 13 — rasmiy PLAY MOBILE SMS-Broker HTTP API. Ikkinchi
          // qatlam himoya (birinchisi — env.schema.ts Zod superRefine).
          const { apiUrl, login, password, sender } = config.playMobile;
          if (!apiUrl || !login || !password || !sender) {
            throw new Error('SMS_PROVIDER=PLAYMOBILE uchun PLAYMOBILE_API_URL/LOGIN/PASSWORD/SENDER majburiy');
          }
          return new PlayMobileProvider({ apiUrl, login, password, sender });
        }
        throw new Error('SMS_PROVIDER: qo‘llab-quvvatlanmaydigan qiymat');
      },
    },
    OtpSmsProcessor,
  ],
  exports: [BullModule, SMS_PROVIDER],
})
export class SmsModule {}
