import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerStatus } from '@prisma/client';

/** Bo'lim 26 — ro'yxat qatori: minimal, operatsion foydali maydonlar. */
export class SellerListItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional() fullName?: string | null;
  @ApiProperty({ enum: SellerStatus }) sellerStatus!: SellerStatus;
  @ApiProperty() createdAt!: Date;
}

/** Bo'lim 26 — tafsilot: BOUNDED sonlar (COUNT), giant include YO'Q. */
export class SellerDetailResponseDto extends SellerListItemResponseDto {
  @ApiProperty() verified!: boolean;
  @ApiProperty() servicesCount!: number;
  @ApiProperty() contractsAsSellerCount!: number;
  @ApiProperty() payoutsSucceededCount!: number;
  @ApiProperty() disputesAsSellerCount!: number;
}
