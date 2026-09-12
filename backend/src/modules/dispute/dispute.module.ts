import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { RefundModule } from '@/modules/refund/refund.module';
import { DisputeService } from './dispute.service';
import { OpenDisputeController } from './open-dispute.controller';
import { MeDisputeController } from './me-dispute.controller';
import { StaffDisputeController } from './staff-dispute.controller';

/**
 * Bosqich 8 — `RefundModule`ni import qiladi (`RefundService`ning
 * `createDisputeRefundRow`/`callProviderAndAdvance` metodlari uchun, bo'lim
 * 25/60: mavjud Refund infratuzilmasi qayta ishlatiladi). `LedgerService` —
 * `@Global() LedgerModule`dan, alohida import shart emas.
 */
@Module({
  imports: [AuthModule, StaffAuthModule, RefundModule],
  controllers: [OpenDisputeController, MeDisputeController, StaffDisputeController],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}
