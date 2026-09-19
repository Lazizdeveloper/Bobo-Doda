import { Module } from '@nestjs/common';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { StaffAdminController } from './staff-admin.controller';
import { StaffAdminService } from './staff-admin.service';

/**
 * Bosqich 11 — `StaffAuthModule`ni import qiladi: `StaffAuthService`ning
 * TOTP-reset/parol-reset/sessiya-bekor-qilish metodlarini QAYTA ISHLATADI
 * (bo'lim 74 — "duplicate admin API yaratma"), guard'lar (`StaffJwtAuthGuard`/
 * `StaffPermissionGuard`) ham shu YO'L bilan keladi.
 */
@Module({
  imports: [StaffAuthModule],
  controllers: [StaffAdminController],
  providers: [StaffAdminService],
})
export class StaffAdminModule {}
