import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_DESTINATION_REFERENCE_LENGTH } from '../payout.constants';

/**
 * Bo'lim 27/36 — `amountSom` seller o'zi kiritadi (Payment/Refund'dan farqli
 * — u yerda summa har doim boshqa yozuvdan olinadi). `destinationReference`
 * — opaque matn (masalan "Uzcard •••• 1234"), xom bank/karta ma'lumoti EMAS
 * (bunday domen bu bosqichda uydirilmaydi, bo'lim 36).
 */
export class CreatePayoutDto {
  @ApiProperty({ description: 'Butun so‘m', minimum: 1 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ minLength: 3, maxLength: MAX_DESTINATION_REFERENCE_LENGTH })
  @IsString()
  @MinLength(3)
  @MaxLength(MAX_DESTINATION_REFERENCE_LENGTH)
  destinationReference!: string;
}
