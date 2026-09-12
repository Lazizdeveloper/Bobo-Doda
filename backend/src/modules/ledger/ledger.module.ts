import { Global, Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { LedgerService } from './ledger.service';
import { LedgerIntegrityService } from './ledger-integrity.service';
import { StaffLedgerController } from './staff-ledger.controller';
import { SellerBalanceController } from './seller-balance.controller';

/**
 * @Global — `AuditModule`/`IdempotencyModule` naqshi bilan bir xil:
 * `LedgerService` `PaymentModule` (webhook) VA `ContractModule` (milestone
 * approve) ikkalasidan ham chaqiriladi, ular bir-birini import qilmaydi —
 * global qilish ikkalasiga ham qo'shimcha `imports` yozmasdan DI orqali
 * ko'rinishini ta'minlaydi.
 */
@Global()
@Module({
  imports: [AuthModule, StaffAuthModule],
  controllers: [StaffLedgerController, SellerBalanceController],
  providers: [LedgerService, LedgerIntegrityService],
  exports: [LedgerService, LedgerIntegrityService],
})
export class LedgerModule {}
