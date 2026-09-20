import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { RefundService } from './refund.service';
import { StaffRefundController } from './staff-refund.controller';
import { MeRefundController } from './me-refund.controller';
import { PaymentWebhookController } from './payment-webhook.controller';

/**
 * Bo'lim 4/12 — `PaymentModule`ni import qiladi (`PaymentService` +
 * eksport qilingan `PAYMENT_PROVIDER` uchun) — ATAYLAB FAQAT SHU YO'NALISHDA
 * (`PaymentModule` `RefundModule`ni import QILMAYDI): circular module
 * dependency yo'q. Shuning uchun `PaymentWebhookController` (ikkalasiga
 * ham bog'liq) shu modulda joylashgan.
 */
@Module({
  imports: [AuthModule, StaffAuthModule, PaymentModule],
  controllers: [StaffRefundController, MeRefundController, PaymentWebhookController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
