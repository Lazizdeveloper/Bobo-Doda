import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { STAFF_PASSWORD_MAX_LENGTH, STAFF_PASSWORD_MIN_LENGTH } from '../staff-auth.constants';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: STAFF_PASSWORD_MIN_LENGTH, maxLength: STAFF_PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(STAFF_PASSWORD_MIN_LENGTH)
  @MaxLength(STAFF_PASSWORD_MAX_LENGTH)
  @Matches(/\S/, { message: 'Parol faqat bo‘sh joylardan iborat bo‘lishi mumkin emas' })
  newPassword!: string;
}
