import { ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialAnomalySeverity } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListAnomaliesQueryDto extends PageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ enum: FinancialAnomalySeverity })
  @IsOptional()
  @IsEnum(FinancialAnomalySeverity)
  severity?: FinancialAnomalySeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ description: 'true — faqat hal qilingan, false — faqat ochiq' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({ description: 'ISO sana — shundan keyin aniqlanganlar' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  since?: Date;
}
