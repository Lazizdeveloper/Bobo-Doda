import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Slug — ATAYLAB o'zgartirib bo'lmaydi (mavjud xizmatlar/havolalar shunga tayanadi). */
export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) nameUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) nameRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
