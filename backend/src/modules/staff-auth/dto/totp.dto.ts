import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const TOTP_CODE_PATTERN = /^\d{6}$/;

export class TotpEnrollResponseDto {
  /** Bosqich 11, bo'lim 10 — FAQAT SHU JAVOBDA bir marta ko'rsatiladi, DB'da plaintext saqlanmaydi, keyin qayta qaytarilmaydi. */
  @ApiProperty() secret!: string;
  @ApiProperty() otpauthUri!: string;
}

export class TotpVerifyDto {
  @ApiProperty({ description: '6 xonali TOTP kod' })
  @IsString()
  @Matches(TOTP_CODE_PATTERN, { message: 'Kod 6 xonali raqam bo‘lishi shart' })
  totpCode!: string;
}

export class TotpDisableDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: '6 xonali TOTP kod' })
  @IsString()
  @Matches(TOTP_CODE_PATTERN, { message: 'Kod 6 xonali raqam bo‘lishi shart' })
  totpCode!: string;
}
