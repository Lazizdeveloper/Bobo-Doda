import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH } from '@/modules/auth/constants/otp.constants';

/** Bosqich 21 — `POST /me/change-password`. Logged-in foydalanuvchi uchun
    (joriy parolni bilgani holda). `AccountSecurity.tsx` bu shaklni
    ALLAQACHON kutgan edi (`INVALID_CURRENT_PASSWORD` xato kodi bilan) —
    ilgari `FEATURE_DISABLED` edi, endi haqiqiy `User.passwordHash` bor. */
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: USER_PASSWORD_MIN_LENGTH, maxLength: USER_PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(USER_PASSWORD_MIN_LENGTH)
  @MaxLength(USER_PASSWORD_MAX_LENGTH)
  @Matches(/\S/, { message: 'Parol faqat bo‘sh joylardan iborat bo‘lishi mumkin emas' })
  newPassword!: string;
}
