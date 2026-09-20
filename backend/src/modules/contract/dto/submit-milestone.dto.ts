import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Fayl-yuklash infratuzilmasi (S3 presigned) hali yo'q (Bosqich 5) —
 * `deliverableUrls` FAQAT tashqi havolalar (masalan Google Drive/Figma).
 * `IsUrl({protocols:['http','https'], require_protocol:true})` —
 * `javascript:`/`data:`/`file:` kabi sxemalarni RAD ETADI (bo'lim 14:
 * "external URL qabul qilinsa security validation").
 */
export class SubmitMilestoneDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  deliverableUrls?: string[];
}
