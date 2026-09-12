import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import {
  DISPUTE_EVIDENCE_TYPES,
  MAX_EVIDENCE_FILE_REFERENCE_LENGTH,
  MAX_EVIDENCE_TEXT_LENGTH,
  type DisputeEvidenceTypeValue,
} from '../dispute.constants';

/** Bo'lim 15 — xom fayl bayti YO'Q, faqat `fileReference` (tashqi obyekt-xotira kaliti/URL). */
export class AddEvidenceDto {
  @IsIn(DISPUTE_EVIDENCE_TYPES)
  type!: DisputeEvidenceTypeValue;

  @ApiPropertyOptional({ maxLength: MAX_EVIDENCE_TEXT_LENGTH })
  @ValidateIf((o: AddEvidenceDto) => o.type === 'TEXT')
  @IsString()
  @MaxLength(MAX_EVIDENCE_TEXT_LENGTH)
  text?: string;

  @ApiPropertyOptional({ maxLength: MAX_EVIDENCE_FILE_REFERENCE_LENGTH })
  @ValidateIf((o: AddEvidenceDto) => o.type === 'FILE')
  @IsString()
  @MaxLength(MAX_EVIDENCE_FILE_REFERENCE_LENGTH)
  fileReference?: string;

  /** Bo'lim 43 — ixtiyoriy, FAQAT shu disputening Contract'iga tegishli milestone (servis tekshiradi). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  milestoneId?: string;
}
