import type { SmsProvider, SmsSendResult } from '@/infra/sms/sms-provider.interface';
import { CapturingSmsProvider } from './fixtures';

export type TestSmsScenario = 'SUCCESS' | 'RETRYABLE_FAILURE' | 'PERMANENT_FAILURE' | 'TIMEOUT' | 'RATE_LIMITED';

/**
 * Bosqich 10, bo'lim 61 — deterministik test provayder. `CapturingSmsProvider`
 * (OTP capture — mavjud barcha e2e fayllarda ishlatiladi) dan MEROS OLADI:
 * shu bitta instansiya OTP login (`loginNewUser`/`createStaffSession`) VA
 * generic Outbox worker testlarida BIR XIL app'da xavfsiz ishlatiladi
 * (ikkalasi ham `lastPhone`/`lastCode`ni to'g'ri kuzatadi).
 *
 * `SmsProvider`ning REAL implementatsiyalari `src/infra/sms/`da yashaydi;
 * bu fayl ATAYLAB `test/`da — production factory (`sms.module.ts`) buni
 * HECH QACHON tanlamaydi, faqat `overrideProvider(SMS_PROVIDER)` orqali
 * e2e testlarda ishlatiladi (Payment/Payout'ning `TestXProvider`laridan
 * farqli — ular production factory'ning `PAYMENT_PROVIDER=TEST` bilan
 * TANLASHI mumkin bo'lgan haqiqiy variant, buning esa unday emas).
 *
 * `queueScenario` — `providerReference` (odatda `OutboxEvent.id`, bo'lim
 * 11) bo'yicha, IZCHIL (Bosqich 9'dagi `TestPaymentProvider.resolveQuery()`
 * saboqi bilan bir xil: natija BIR MARTALIK ISTE'MOL QILINMAYDI — real
 * provider bir xil so'rov qayta yuborilsa ham izchil javob beradi,
 * parallel/qayta-claim testlari buni talab qiladi).
 */
export class TestSmsProvider extends CapturingSmsProvider implements SmsProvider {
  private readonly scenarios = new Map<string, TestSmsScenario>();
  /** Test tekshiruvlari uchun — qaysi reference'lar bilan HAQIQIY "yuborish" chaqirilgani. */
  readonly sentReferences: string[] = [];

  queueScenario(reference: string, scenario: TestSmsScenario): void {
    this.scenarios.set(reference, scenario);
  }

  async send(
    phone: string,
    template: string,
    params: Record<string, string>,
    options?: { reference?: string },
  ): Promise<SmsSendResult> {
    this.lastPhone = phone;
    this.lastCode = params.code;
    const key = options?.reference ?? phone;
    const scenario = this.scenarios.get(key) ?? 'SUCCESS';

    if (scenario === 'TIMEOUT') {
      throw new Error('Test SMS provider: tarmoq timeout (ambiguous — yuborilgan bo‘lishi ham mumkin)');
    }
    if (scenario === 'PERMANENT_FAILURE') {
      return { success: false, errorMessage: 'Test: yaroqsiz qabul qiluvchi raqam', permanent: true };
    }
    if (scenario === 'RATE_LIMITED') {
      return { success: false, errorMessage: 'Test: rate limit (429)', permanent: false, retryAfterSeconds: 5 };
    }
    if (scenario === 'RETRYABLE_FAILURE') {
      return { success: false, errorMessage: 'Test: vaqtinchalik provider xatosi', permanent: false };
    }

    this.sentReferences.push(key);
    return { success: true, providerMessageId: `test-sms-${key}` };
  }
}
