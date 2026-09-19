import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SellerStatus, UserStatus } from '@prisma/client';

export class MeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional({ nullable: true }) fullName!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) avatarKey!: string | null;
  @ApiProperty({ enum: Role, isArray: true }) roles!: Role[];
  @ApiPropertyOptional({ enum: Role, nullable: true }) activeRole!: Role | null;
  @ApiProperty() roleChosen!: boolean;
  @ApiProperty() profileDone!: boolean;
  @ApiProperty() verified!: boolean;
  /** Bosqich 3 — hisob moderatsiyasi holati. */
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  /** "role=SELLER" (layoqat, `roles`) DAN MUSTAQIL — haqiqiy faollik huquqi. */
  @ApiProperty({ enum: SellerStatus }) sellerStatus!: SellerStatus;
  @ApiProperty() createdAt!: Date;
}
