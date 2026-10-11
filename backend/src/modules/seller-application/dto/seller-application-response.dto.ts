import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerApplicationStatus, type SellerApplication } from '@prisma/client';

/** `reviewedByStaffId`/`version` ATAYLAB YO'Q — ichki moderatsiya detali (bo'lim 22). */
export class SellerApplicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() legalName!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) passportNumber?: string | null;
  @ApiPropertyOptional({ nullable: true }) inn?: string | null;
  @ApiPropertyOptional({ nullable: true }) companyDetails?: string | null;
  @ApiProperty({ enum: SellerApplicationStatus }) status!: SellerApplicationStatus;
  @ApiProperty() submittedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) reviewedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) rejectionReason!: string | null;
  @ApiProperty() createdAt!: Date;
}

function parseKycFromDescription(desc: string | null): {
  passportNumber?: string;
  inn?: string;
  companyDetails?: string;
} {
  if (!desc) return {};
  const match = desc.match(/\[KYC\/AML:\s*(.*?)\]/);
  if (!match || !match[1]) return {};
  const result: { passportNumber?: string; inn?: string; companyDetails?: string } = {};
  const parts = match[1].split(' | ');
  for (const part of parts) {
    if (part.startsWith('Pasport/ID: ')) result.passportNumber = part.replace('Pasport/ID: ', '').trim();
    if (part.startsWith('STIR/INN: ')) result.inn = part.replace('STIR/INN: ', '').trim();
    if (part.startsWith('Yuridik: ')) result.companyDetails = part.replace('Yuridik: ', '').trim();
  }
  return result;
}

/** Prisma model → DTO — controller Prisma obyektini TO'G'RIDAN-TO'G'RI qaytarmasin. */
export function toSellerApplicationResponseDto(app: SellerApplication): SellerApplicationResponseDto {
  const kyc = parseKycFromDescription(app.description);
  return {
    id: app.id,
    userId: app.userId,
    legalName: app.legalName,
    displayName: app.displayName,
    description: app.description,
    passportNumber: kyc.passportNumber ?? null,
    inn: kyc.inn ?? null,
    companyDetails: kyc.companyDetails ?? null,
    status: app.status,
    submittedAt: app.submittedAt,
    reviewedAt: app.reviewedAt,
    rejectionReason: app.rejectionReason,
    createdAt: app.createdAt,
  };
}
