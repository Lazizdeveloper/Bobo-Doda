import { ApiProperty } from '@nestjs/swagger';
import { DisputeReason } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class OpenDisputeDto {
  @ApiProperty({ enum: DisputeReason })
  @IsEnum(DisputeReason)
  reason!: DisputeReason;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}
