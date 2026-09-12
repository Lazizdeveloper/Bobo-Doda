import { Module } from '@nestjs/common';
import { SmsModule } from '@/infra/sms/sms.module';
import { TokenModule } from './token.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RefreshTokenService } from './refresh-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Marketplace auth (Bosqich 2). Staff auth — BUTUNLAY alohida modul
 * (`StaffAuthModule`), faqat `TokenModule`ni umumiy ishlatadi.
 *
 * `JwtAuthGuard`/`RolesGuard` bu yerda EXPORT qilinadi: `JwtAuthGuard`
 * `app.module.ts`da GLOBAL (`APP_GUARD`) ro'yxatdan o'tadi, `RolesGuard`
 * esa har domen moduli o'zi kerak bo'lgan marshrutda `@UseGuards`
 * qiladi (`@Roles()` bilan birga).
 */
@Module({
  imports: [SmsModule, TokenModule],
  controllers: [AuthController],
  providers: [AuthService, OtpService, RefreshTokenService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, RefreshTokenService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
