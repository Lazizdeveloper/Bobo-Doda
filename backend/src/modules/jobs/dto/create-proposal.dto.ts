import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { MAX_SOM } from '@/common/money/money.util';

export class CreateProposalDto {
  @ApiProperty({ description: 'Taklif summasi (kamida 1 000 so‘m)', minimum: 1_000, maximum: MAX_SOM })
  @IsInt()
  @Min(1_000)
  @Max(MAX_SOM)
  bidAmount!: number;

  @ApiProperty({ minLength: 5, maxLength: 5000 })
  @IsString()
  @MinLength(5)
  coverLetter!: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  screeningAnswers?: { question: string; answer: string }[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachedImages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  estimatedDeliveryDays?: number;
}
