import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({ example: 'admin@bobododa.uz' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ description: '2FA yoqilgan hisoblar uchun majburiy (TOTP, 6 xona)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Kod 6 xonali raqam bo’lishi shart' })
  totpCode?: string;
}
