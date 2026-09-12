import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Format tekshiruvi ATAYLAB bu yerda emas — `normalizePhone()` (E.164,
 * `libphonenumber-js`) yagona manba. DTO faqat "bo'sh emas satr" talab
 * qiladi, aks holda ikki xil qoida ikki joyda saqlanardi.
 */
export class RequestOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}
