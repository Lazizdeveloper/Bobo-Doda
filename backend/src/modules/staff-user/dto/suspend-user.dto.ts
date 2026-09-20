import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({ description: 'ISO sana — berilmasa muddatsiz (staff qo‘lda tugatadi)' })
  @IsOptional()
  @IsDateString()
  suspendedUntil?: string;
}
