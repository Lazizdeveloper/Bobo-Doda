import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialAnomalySeverity, type FinancialAnomaly } from '@prisma/client';

export class AnomalyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: FinancialAnomalySeverity }) severity!: FinancialAnomalySeverity;
  @ApiProperty() entityType!: string;
  @ApiProperty() entityId!: string;
  @ApiProperty() description!: string;
  @ApiProperty() detectedAt!: Date;
  @ApiPropertyOptional() resolvedAt?: Date | null;
  @ApiPropertyOptional() resolvedByStaffId?: string | null;
  @ApiPropertyOptional() resolutionNote?: string | null;
}

export function toAnomalyResponseDto(anomaly: FinancialAnomaly): AnomalyResponseDto {
  return {
    id: anomaly.id,
    code: anomaly.code,
    severity: anomaly.severity,
    entityType: anomaly.entityType,
    entityId: anomaly.entityId,
    description: anomaly.description,
    detectedAt: anomaly.detectedAt,
    resolvedAt: anomaly.resolvedAt,
    resolvedByStaffId: anomaly.resolvedByStaffId,
    resolutionNote: anomaly.resolutionNote,
  };
}
