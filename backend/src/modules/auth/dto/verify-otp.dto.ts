import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '482913', description: '6 xonali OTP kodi' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Kod 6 xonali raqam bo’lishi shart' })
  code!: string;
}
