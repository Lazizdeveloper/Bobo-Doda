import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Format tekshiruvi ATAYLAB bu yerda emas — `normalizePhone()` (E.164,
 * `libphonenumber-js`) yagona manba. DTO faqat "bo'sh emas satr" talab
 * qiladi, aks holda ikki xil qoida ikki joyda saqlanardi.
 *
 * Bosqich 21 — `POST /auth/register/request-otp` VA
 * `POST /auth/password-reset/request-otp` ikkalasi ham shu BITTA DTO'ni
 * ishlatadi (maqsad marshrut orqali aniqlanadi — body'da `purpose`/`intent`
 * maydoni YO'Q, chunki OTP yetkazish baribir SMS-only, kanal tanlash
 * kerak emas).
 */
export class RequestOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}
