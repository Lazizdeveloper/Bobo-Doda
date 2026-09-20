import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'dizayn', description: 'kichik harf, raqam, tire (kebab-case)' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug faqat kichik lotin harf/raqam/tire (masalan "grafik-dizayn")',
  })
  slug!: string;

  @ApiProperty() @IsString() @MaxLength(100) nameUz!: string;
  @ApiProperty() @IsString() @MaxLength(100) nameRu!: string;
  @ApiProperty() @IsString() @MaxLength(100) nameEn!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
