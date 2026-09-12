import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConsoleSmsProvider } from './console-sms.provider';
import { SMS_PROVIDER } from './sms-provider.interface';
import { OtpSmsProcessor, OTP_SMS_QUEUE } from './otp-sms.processor';

/**
 * Real provayderga o'tish — FAQAT shu modulda: `useClass: ConsoleSmsProvider`
 * ni `EskizProvider`/`PlayMobileProvider`ga almashtirish (yoki `NODE_ENV`
 * asosida tanlash). Boshqa hech qayerda `SmsProvider`ga qattiq bog'lanish yo'q.
 */
@Module({
  imports: [BullModule.registerQueue({ name: OTP_SMS_QUEUE })],
  providers: [{ provide: SMS_PROVIDER, useClass: ConsoleSmsProvider }, OtpSmsProcessor],
  exports: [BullModule, SMS_PROVIDER],
})
export class SmsModule {}
