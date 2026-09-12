import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DisputeEvidence } from '@prisma/client';

export class DisputeEvidenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() disputeId!: string;
  @ApiPropertyOptional() submittedByUserId?: string | null;
  @ApiPropertyOptional() submittedByStaffId?: string | null;
  @ApiProperty() type!: string;
  @ApiPropertyOptional() text?: string | null;
  @ApiPropertyOptional() fileReference?: string | null;
  @ApiPropertyOptional() milestoneId?: string | null;
  @ApiProperty() createdAt!: Date;
}

export function toDisputeEvidenceResponseDto(evidence: DisputeEvidence): DisputeEvidenceResponseDto {
  return {
    id: evidence.id,
    disputeId: evidence.disputeId,
    submittedByUserId: evidence.submittedByUserId,
    submittedByStaffId: evidence.submittedByStaffId,
    type: evidence.type,
    text: evidence.text,
    fileReference: evidence.fileReference,
    milestoneId: evidence.milestoneId,
    createdAt: evidence.createdAt,
  };
}
