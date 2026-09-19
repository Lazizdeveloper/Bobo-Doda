import { Module } from '@nestjs/common';
import { TokenModule } from '@/modules/auth/token.module';
import { StaffAuthController, StaffMeController } from './staff-auth.controller';
import { StaffAuthService } from './staff-auth.service';
import { StaffJwtAuthGuard } from './guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from './guards/staff-permission.guard';

/**
 * Staff (admin panel) auth — marketplace `AuthModule`ga BOG'LANMAGAN,
 * faqat `TokenModule`ni baham ko'radi (imzolash mexanizmi umumiy,
 * sirlar/qaror mantig'i alohida — ADR-04).
 *
 * `TokenModule` `exports`da ham bor (nafaqat `imports`da) — Bosqich 3'dagi
 * domen modullari (`CategoryModule`, `ServiceModule`, ...) `StaffJwtAuthGuard`ni
 * `@UseGuards()` orqali ishlatadi; Nest guard'ni O'Z HOST MODULI (masalan
 * `CategoryModule`) doirasida qayta bog'laydi, shuning uchun uning O'ZINING
 * bog'liqligi (`TokenService`) ham o'sha modulga TRANZITIV ko'rinishi kerak
 * — aks holda "TokenService CategoryModule'da topilmadi" xatosi chiqadi.
 */
@Module({
  imports: [TokenModule],
  controllers: [StaffAuthController, StaffMeController],
  providers: [StaffAuthService, StaffJwtAuthGuard, StaffPermissionGuard],
  exports: [TokenModule, StaffAuthService, StaffJwtAuthGuard, StaffPermissionGuard],
})
export class StaffAuthModule {}
