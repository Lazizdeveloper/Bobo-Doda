import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Bo'lim 5/8 — `amount`/`currency` DTO'da UMUMAN YO'Q: har doim
 * `Payment.amount`dan olinadi (client/staff summani TANLAMAYDI).
 * `reason` MAJBURIY — staff nima uchun refund qilayotganini yozadi
 * (`AuditLog`ga tushadi, rekonsiliatsiya uchun).
 */
export class CreateRefundDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty({ minLength: 10, maxLength: 500 })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}
