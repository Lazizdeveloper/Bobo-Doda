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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
