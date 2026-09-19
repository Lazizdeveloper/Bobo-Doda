import { ApiProperty } from '@nestjs/swagger';
import { ContractStatus, type Contract, type Milestone } from '@prisma/client';
import { tiyinToSom } from '@/common/money/money.util';
import { MilestoneResponseDto, toMilestoneResponseDto } from './milestone-response.dto';

/**
 * Buyer/seller/staff — UCHALASI HAM bir xil DTO (Phase 3'dagi public/owner
 * ikki xillikdan farqli — bu yerda "public" ko'rinish umuman yo'q, faqat
 * ikki tomon + read-only staff, sezgir maydon yo'q).
 */
export class ContractResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() buyerId!: string;
  @ApiProperty() sellerId!: string;
  @ApiProperty() serviceId!: string;

  @ApiProperty() serviceTitleSnapshot!: string;
  @ApiProperty() serviceDescriptionSnapshot!: string;
  @ApiProperty() categoryNameSnapshot!: string;
  @ApiProperty() sellerDisplayNameSnapshot!: string;

  @ApiProperty({ description: 'Butun so‘m' }) agreedAmount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() platformFeeRateBps!: number;
  @ApiProperty({ description: 'Butun so‘m — informatsion, hali undirilmagan' })
  platformFeeAmount!: number;

  @ApiProperty() deadline!: Date;
  @ApiProperty({ enum: ContractStatus }) status!: ContractStatus;

  @ApiProperty({ type: [MilestoneResponseDto] }) milestones!: MilestoneResponseDto[];

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export function toContractResponseDto(
  contract: Contract & { milestones?: Milestone[] },
): ContractResponseDto {
  return {
    id: contract.id,
    buyerId: contract.buyerId,
    sellerId: contract.sellerId,
    serviceId: contract.serviceId,
    serviceTitleSnapshot: contract.serviceTitleSnapshot,
    serviceDescriptionSnapshot: contract.serviceDescriptionSnapshot,
    categoryNameSnapshot: contract.categoryNameSnapshot,
    sellerDisplayNameSnapshot: contract.sellerDisplayNameSnapshot,
    agreedAmount: tiyinToSom(contract.agreedAmount),
    currency: contract.currency,
    platformFeeRateBps: contract.platformFeeRateBpsSnapshot,
    platformFeeAmount: tiyinToSom(contract.platformFeeAmountSnapshot),
    deadline: contract.deadline,
    status: contract.status,
    milestones: (contract.milestones ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(toMilestoneResponseDto),
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}
