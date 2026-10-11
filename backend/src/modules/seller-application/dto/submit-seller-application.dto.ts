import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Limitlar — `lib/validate.ts#LIMITS` bilan bir xil (frontend konvensiyasi). */
export class SubmitSellerApplicationDto {
  @ApiProperty({ description: 'Haqiqiy F.I.Sh — KYC uchun' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  legalName!: string;

  @ApiProperty({ description: 'Bozorda ko’rinadigan nom' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional({ description: 'Qo‘shimcha tavsif yoki kasbiy ma’lumot' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Pasport yoki ID karta raqami (masalan: AA1234567) — KYC/AML tekshiruvi uchun' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string;

  @ApiPropertyOptional({ description: 'STIR (INN) soliq to‘lovchi identifikatsiya raqami (9 xonali)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inn?: string;

  @ApiPropertyOptional({ description: 'Yuridik shaxs yoki YTT ma’lumotlari' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyDetails?: string;
}
