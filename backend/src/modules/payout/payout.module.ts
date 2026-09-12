import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { GuardsModule } from '@/common/guards/guards.module';
import { AppConfigService } from '@/config/app-config.service';
import { PAYOUT_PROVIDER } from './providers/payout-provider.interface';
import { TestPayoutProvider } from './providers/test/test-payout.provider';
import { PayoutService } from './payout.service';
import { SellerPayoutController } from './seller-payout.controller';
import { StaffPayoutController } from './staff-payout.controller';
import { PayoutWebhookController } from './payout-webhook.controller';

/** FAQAT dev/test — production'da hech qachon ishlatilmaydi (pastdagi fail-fast). */
const DEV_ONLY_TEST_SECRET = 'test-only-insecure-payout-secret-change-me';

/**
 * Bosqich 7 — payout domeni. `PaymentModule`'dan MUSTAQIL provider registry
 * (bo'lim 28): real hayotda payout rail'i to'lov gateway'idan butunlay
 * boshqa kompaniya bo'lishi mumkin, shuning uchun ALOHIDA `PAYOUT_PROVIDER`
 * token/factory/webhook route.
 */
@Module({
  imports: [AuthModule, StaffAuthModule, GuardsModule],
  controllers: [SellerPayoutController, StaffPayoutController, PayoutWebhookController],
  providers: [
    PayoutService,
    {
      provide: PAYOUT_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { provider, testWebhookSecret } = config.payout;
        if (provider === 'TEST') {
          // Ikkinchi qatlam himoya (`env.schema.ts`da PAYOUT_PROVIDER uchun
          // Zod darajasida DUBLIKAT YO'Q — izohga qarang: hozircha yagona
          // qiymat TEST bo'lgani uchun bitta joyda yetarli, lekin baribir
          // fail-closed bo'lishi SHART).
          if (config.isProduction) {
            throw new Error("PAYOUT_PROVIDER=TEST production'da ishlatib bo'lmaydi (fail closed)");
          }
          return new TestPayoutProvider(testWebhookSecret ?? DEV_ONLY_TEST_SECRET);
        }
        // Hozircha `PAYOUT_PROVIDER` enum'ida TEST'dan boshqa qiymat YO'Q
        // (bo'lim 28: real rail spec yo'q, o'ylab topilmaydi) — bu shox
        // faqat kelajakda enum kengaytirilganda ishga tushadi.
        throw new Error('PAYOUT_PROVIDER: qo‘llab-quvvatlanmaydigan qiymat (hali implement qilinmagan)');
      },
    },
  ],
  exports: [PayoutService],
})
export class PayoutModule {}
