import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';
import { MAX_SOM } from '@/common/money/money.util';

export class ListJobsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Kategoriya slug yoki UUID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: 'Qidiruv so‘zi' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'Minimal byudjet' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_SOM)
  budgetMin?: number;

  @ApiPropertyOptional({ description: 'Maksimal byudjet' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_SOM)
  budgetMax?: number;
}
