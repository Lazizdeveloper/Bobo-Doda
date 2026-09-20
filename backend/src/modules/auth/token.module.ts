import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service';

/**
 * `TokenService` marketplace VA staff tokenlarini imzolaydi (har chaqiruvda
 * aniq sir/TTL beriladi — `JwtModule.register({})` shuning uchun bo'sh).
 * Alohida modul — `AuthModule` (marketplace, SMS/OTP'ga bog'liq) va
 * `StaffAuthModule` (staff) ikkalasi ham import qiladi, bir-biriga
 * BOG'LANMASDAN (ADR-04 izolyatsiyasi modul darajasida ham saqlanadi).
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
