import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneStatus, type Milestone } from '@prisma/client';
import { tiyinToSom } from '@/common/money/money.util';

export class MilestoneResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() contractId!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ description: 'Butun so‘m' }) amount!: number;
  @ApiProperty() position!: number;
  @ApiProperty({ enum: MilestoneStatus }) status!: MilestoneStatus;
  @ApiPropertyOptional({ nullable: true }) dueAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) submittedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) approvedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export function toMilestoneResponseDto(m: Milestone): MilestoneResponseDto {
  return {
    id: m.id,
    contractId: m.contractId,
    title: m.title,
    description: m.description,
    amount: tiyinToSom(m.amount),
    position: m.position,
    status: m.status,
    dueAt: m.dueAt,
    submittedAt: m.submittedAt,
    approvedAt: m.approvedAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
