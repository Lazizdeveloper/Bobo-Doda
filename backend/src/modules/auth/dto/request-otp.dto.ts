import { ApiProperty } from '@nestjs/swagger';
import { AuthIntent } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

/**
 * Format tekshiruvi ATAYLAB bu yerda emas — `normalizePhone()` (E.164,
 * `libphonenumber-js`) yagona manba. DTO faqat "bo'sh emas satr" talab
 * qiladi, aks holda ikki xil qoida ikki joyda saqlanardi.
 *
 * Bosqich 20 — `intent` OTP yetkazish KANALI EMAS (u doim SMS, OTP siyosati
 * audit qarang) — bu LOGIN va REGISTER oqimlarini ajratuvchi niyat. Login
 * hech qachon foydalanuvchi yaratmaydi, register hech qachon mavjud
 * hisobga ustidan yozmaydi (`AuthService.login`/`register`).
 */
export class RequestOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ enum: AuthIntent, example: 'LOGIN' })
  @IsEnum(AuthIntent)
  intent!: AuthIntent;
}
