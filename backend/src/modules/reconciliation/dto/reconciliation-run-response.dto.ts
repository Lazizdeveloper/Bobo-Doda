import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReconciliationRunStatus, ReconciliationTrigger, type ReconciliationRun } from '@prisma/client';

export class ReconciliationRunResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() operationType!: string;
  @ApiProperty() operationId!: string;
  @ApiProperty() provider!: string;
  @ApiProperty({ enum: ReconciliationTrigger }) trigger!: ReconciliationTrigger;
  @ApiProperty({ enum: ReconciliationRunStatus }) status!: ReconciliationRunStatus;
  @ApiProperty() observedLocalStatus!: string;
  @ApiPropertyOptional() observedProviderStatus?: string | null;
  @ApiPropertyOptional() actionTaken?: string | null;
  @ApiPropertyOptional() errorCode?: string | null;
  @ApiProperty() startedAt!: Date;
  @ApiProperty() completedAt!: Date;
}

export function toReconciliationRunResponseDto(run: ReconciliationRun): ReconciliationRunResponseDto {
  return {
    id: run.id,
    operationType: run.operationType,
    operationId: run.operationId,
    provider: run.provider,
    trigger: run.trigger,
    status: run.status,
    observedLocalStatus: run.observedLocalStatus,
    observedProviderStatus: run.observedProviderStatus,
    actionTaken: run.actionTaken,
    errorCode: run.errorCode,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}
