import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerApplicationStatus, type SellerApplication } from '@prisma/client';

/** `reviewedByStaffId`/`version` ATAYLAB YO'Q — ichki moderatsiya detali (bo'lim 22). */
export class SellerApplicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() legalName!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: SellerApplicationStatus }) status!: SellerApplicationStatus;
  @ApiProperty() submittedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) reviewedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) rejectionReason!: string | null;
  @ApiProperty() createdAt!: Date;
}

/** Prisma model → DTO — controller Prisma obyektini TO'G'RIDAN-TO'G'RI qaytarmasin. */
export function toSellerApplicationResponseDto(app: SellerApplication): SellerApplicationResponseDto {
  return {
    id: app.id,
    userId: app.userId,
    legalName: app.legalName,
    displayName: app.displayName,
    description: app.description,
    status: app.status,
    submittedAt: app.submittedAt,
    reviewedAt: app.reviewedAt,
    rejectionReason: app.rejectionReason,
    createdAt: app.createdAt,
  };
}
