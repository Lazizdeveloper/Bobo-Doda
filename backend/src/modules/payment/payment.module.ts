import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { GuardsModule } from '@/common/guards/guards.module';
import { AppConfigService } from '@/config/app-config.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { TestPaymentProvider } from './providers/test/test-payment.provider';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MePaymentController } from './me-payment.controller';
import { StaffPaymentController } from './staff-payment.controller';

/** FAQAT dev/test — production'da hech qachon ishlatilmaydi (pastdagi fail-fast). */
const DEV_ONLY_TEST_SECRET = 'test-only-insecure-secret-change-me';

/**
 * Bosqich 5 — payment domeni. Provider registry SHU YERDA, BITTA joyda
 * (bo'lim 6/7): real Payme/Click ulanganda faqat shu factory'ga yangi
 * `case` qo'shiladi — `PaymentService`/controller'lar TEGILMAYDI.
 *
 * `PaymentWebhookController` Bosqich 7'dan boshlab SHU modulda EMAS —
 * `RefundModule`da (bo'lim 4): bitta webhook route endi Payment VA Refund
 * hodisalarini ham qabul qiladi, uni shu ikki servisga bog'liq bo'lgan
 * modulga qo'yish `PaymentModule`↔`RefundModule` orasida circular import
 * yaratmaydi (`RefundModule` `PaymentModule`ni import qiladi, aksincha EMAS).
 */
@Module({
  imports: [AuthModule, StaffAuthModule, GuardsModule],
  controllers: [PaymentController, MePaymentController, StaffPaymentController],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { provider, testWebhookSecret } = config.payment;
        if (provider === 'TEST') {
          // Ikkinchi qatlam himoya (birinchisi — `env.schema.ts` Zod
          // `superRefine`, boot'dan OLDIN ishlaydi). F1/ADR-03 bilan bir
          // xil falsafa: kritik fail-closed tekshiruv bitta joyga ishonib
          // qolmaydi.
          if (config.isProduction) {
            throw new Error("PAYMENT_PROVIDER=TEST production'da ishlatib bo'lmaydi (fail closed)");
          }
          return new TestPaymentProvider(testWebhookSecret ?? DEV_ONLY_TEST_SECRET);
        }
        // PAYME/CLICK — bo'lim 7: real signature/callback protokoli repo
        // yoki docs'da HECH QAYERDA yo'q, o'ylab topilmaydi. Uydirma
        // implementatsiya o'rniga aniq xabar bilan boot rad etiladi —
        // real provider rasmiy spetsifikatsiya bilan qo'shilganda shu
        // `case` YANGI provider klassiga almashtiriladi.
        throw new Error(
          `PAYMENT_PROVIDER=${provider} hali implement qilinmagan (rasmiy protokol spetsifikatsiyasi yo'q) — ` +
            'PAYMENT_PROVIDER=TEST bilan (faqat dev/test) yoki real integratsiya qo‘shilgach ishga tushiring.',
        );
      },
    },
  ],
  // `PAYMENT_PROVIDER` export qilinadi — `RefundModule` shu bitta provider
  // instansiyasini (Refund HAM shu orqali provider'ga murojaat qiladi,
  // bo'lim 4/12) qayta ishlatadi, ikkinchi registry YARATMAYDI.
  exports: [PaymentService, PAYMENT_PROVIDER],
})
export class PaymentModule {}
