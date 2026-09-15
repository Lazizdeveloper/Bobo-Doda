import { ApiProperty } from '@nestjs/swagger';
import { AuthIntent } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '482913', description: '6 xonali OTP kodi' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Kod 6 xonali raqam bo’lishi shart' })
  code!: string;

  /** `RequestOtpDto.intent`dagi izohga qarang — LOGIN kodi bilan REGISTER
      tasdiqlab bo'lmaydi (`OtpService.verifyOtp` `WHERE`i shuni ta'minlaydi). */
  @ApiProperty({ enum: AuthIntent, example: 'LOGIN' })
  @IsEnum(AuthIntent)
  intent!: AuthIntent;
}
