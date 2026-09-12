import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MAX_SOM } from '@/common/money/money.util';

/** Har biri kelajakdagi `Milestone` qatoriga to'g'ridan-to'g'ri mos keladi. */
export class CreateMilestoneInputDto {
  @ApiProperty({ minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Butun so‘m', minimum: 1, maximum: MAX_SOM })
  @IsInt()
  @Min(1)
  @Max(MAX_SOM)
  amount!: number;

  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

/**
 * `agreedAmount` DTO'da YO'Q — har doim `service.price`ga qattiq bog'langan
 * (bo'lim 13/27: buyer summani o'zgartira olmaydi, faqat qanday
 * bo'linishini). `milestones[].amount` YIG'INDISI `service.price`ga TENG
 * bo'lishi shart (servis qatlamida tekshiriladi — `MILESTONE_AMOUNT_MISMATCH`).
 *
 * Massiv chegarasi ikki qatlamli: `@ArrayMaxSize(50)` — DTO darajasida
 * himoya (haddan tashqari katta payload), haqiqiy biznes chegarasi (20)
 * servis qatlamida `TOO_MANY_MILESTONES` bilan (aniqroq xato kodi uchun).
 */
export class CreateContractDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ description: 'ISO 8601 — kelajakda bo‘lishi shart' })
  @IsDateString()
  deadline!: string;

  @ApiProperty({ type: [CreateMilestoneInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneInputDto)
  milestones!: CreateMilestoneInputDto[];
}
