import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH } from '../constants/otp.constants';

/** Bosqich 21 — `POST /auth/register/complete`. `confirmPassword` mosligi
    servisda tekshiriladi (`AuthService.completeRegistration` — cross-field
    tekshiruv class-validator'da tabiiy emas). */
export class CompleteRegistrationDto {
  @ApiProperty({ description: '`verify-otp` javobidagi qisqa umrli token' })
  @IsString()
  @IsNotEmpty()
  registrationToken!: string;

  @ApiProperty({ minLength: USER_PASSWORD_MIN_LENGTH, maxLength: USER_PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(USER_PASSWORD_MIN_LENGTH)
  @MaxLength(USER_PASSWORD_MAX_LENGTH)
  @Matches(/\S/, { message: 'Parol faqat bo‘sh joylardan iborat bo‘lishi mumkin emas' })
  password!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;
}
