import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Offset sahifalash — ADR-06: "admin navbatlari (sahifa raqami ko'rsatiladi),
 * katalog (qidiruv natijalari)" ikkalasi ham OFFSETLI. `AdminPage<T>`
 * (`docs/00-api-surface.md` §4.3) bilan BIR XIL shakl — yangi naqsh emas.
 *
 * `findMany()` ATAYLAB hech qachon chegarasiz chaqirilmasin — `perPage`
 * qat'iy 100 bilan cheklangan.
 */
export class PageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}

export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function buildPage<T>(items: T[], total: number, page: number, perPage: number): Page<T> {
  return { items, page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}
