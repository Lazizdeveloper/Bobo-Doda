import { ApiProperty } from '@nestjs/swagger';
import { FinancialAnomalySeverity } from '@prisma/client';

export class ReconciliationSummaryResponseDto {
  @ApiProperty() totalAnomalies!: number;
  @ApiProperty() unresolvedAnomalies!: number;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  unresolvedBySeverity!: Record<FinancialAnomalySeverity, number>;
  @ApiProperty() stuckPayments!: number;
  @ApiProperty() stuckRefunds!: number;
  @ApiProperty() stuckPayouts!: number;
}
