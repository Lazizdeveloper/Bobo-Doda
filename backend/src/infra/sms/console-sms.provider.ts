import { Injectable } from '@nestjs/common';
import type { SmsProvider, SmsSendResult } from './sms-provider.interface';

/**
 * Dev/test provayder — SMS'ni HAQIQIY yubormaydi, konsolga chiqaradi.
 *
 * ATAYLAB `console.log` (Pino logger EMAS): strukturaviy logger'ning
 * redact ro'yxati production uchun — bu yerda esa dasturchi kodni
 * TERMINALDA darhol ko'rishi kerak (lokal OTP tekshiruvi). Bu yagona joy
 * qayerda OTP kodi biror joyga yoziladi (`OtpService` uni hech qachon
 * `this.logger`ga bermaydi).
 */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  async send(
    phone: string,
    template: string,
    params: Record<string, string>,
  ): Promise<SmsSendResult> {
    console.log(`\n📱 [SMS DEV — ${template}] → ${phone}`, params, '\n');
    return { success: true, providerMessageId: `dev-${Date.now()}` };
  }
}
