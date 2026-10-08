import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_SOM } from '@/common/money/money.util';

export class CreateJobDto {
  @ApiProperty({ description: 'Kategoriya slug yoki UUID' })
  @IsString()
  category!: string;

  @ApiProperty({ minLength: 5, maxLength: 200 })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ minLength: 20, maxLength: 5000 })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ description: 'Minimal byudjet (butun so‘m)', minimum: 1, maximum: MAX_SOM })
  @IsInt()
  @Min(1)
  @Max(MAX_SOM)
  budgetMin!: number;

  @ApiProperty({ description: 'Maksimal byudjet (butun so‘m)', minimum: 1, maximum: MAX_SOM })
  @IsInt()
  @Min(1)
  @Max(MAX_SOM)
  budgetMax!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsRequired?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Maksimal 3 ta savol' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  screeningQuestions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ type: [String], description: 'Ixtiyoriy ilova qilingan rasmlar/fayllar' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachedImages?: string[];
}
