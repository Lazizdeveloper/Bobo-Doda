import { Module } from '@nestjs/common';
import { AccountStatusGuard } from './account-status.guard';
import { SellerEligibilityGuard } from './seller-eligibility.guard';

/**
 * Bosqich 3'ning ikki qayta-ishlatiladigan guard'i. Alohida modul (Phase 2
 * `AuthModule`dagi `JwtAuthGuard`/`RolesGuard` naqshi bilan bir xil) — har
 * domen moduli import qiladi, DI resolution aniq bo'lsin deb har joyda
 * qo'lda ro'yxatdan o'tkazilmaydi.
 */
@Module({
  providers: [AccountStatusGuard, SellerEligibilityGuard],
  exports: [AccountStatusGuard, SellerEligibilityGuard],
})
export class GuardsModule {}
