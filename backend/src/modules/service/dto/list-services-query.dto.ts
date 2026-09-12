import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';
import { MAX_SOM } from '@/common/money/money.util';

export const SERVICE_SORT_VALUES = ['newest', 'price_asc', 'price_desc'] as const;
export type ServiceSort = (typeof SERVICE_SORT_VALUES)[number];

/** `GET /services` — noma'lum `sort` REJECT qilinadi (`@IsIn`, whitelist ValidationPipe bilan birga). */
export class ListServicesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Kategoriya slug' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: 'Sotuvchi userId' })
  @IsOptional()
  @IsUUID()
  seller?: string;

  @ApiPropertyOptional({ description: 'Butun so‘m' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_SOM)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Butun so‘m' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_SOM)
  priceMax?: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: SERVICE_SORT_VALUES, default: 'newest' })
  @IsOptional()
  @IsIn(SERVICE_SORT_VALUES)
  sort?: ServiceSort;
}
