import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OutboxSummaryResponseDto {
  @ApiProperty() pending!: number;
  @ApiProperty() processing!: number;
  @ApiProperty() dead!: number;
  @ApiProperty() skipped!: number;
  @ApiPropertyOptional({ description: 'Eng eski PENDING qatorning yoshi (soniyada) — null bo‘lsa PENDING qator yo‘q' })
  oldestPendingAgeSeconds?: number | null;
}
