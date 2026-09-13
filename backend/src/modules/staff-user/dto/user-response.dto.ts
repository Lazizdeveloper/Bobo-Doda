import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SellerStatus, UserStatus, type User } from '@prisma/client';

/** Bo'lim 22/49 — `passwordHash` HECH QACHON qaytarilmaydi. */
export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional() fullName?: string | null;
  @ApiPropertyOptional() email?: string | null;
  @ApiProperty({ enum: Role, isArray: true }) roles!: Role[];
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiPropertyOptional() statusReason?: string | null;
  @ApiPropertyOptional() statusChangedAt?: Date | null;
  @ApiPropertyOptional() suspendedUntil?: Date | null;
  @ApiProperty({ enum: SellerStatus }) sellerStatus!: SellerStatus;
  @ApiProperty() verified!: boolean;
  @ApiProperty() createdAt!: Date;
}

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles,
    status: user.status,
    statusReason: user.statusReason,
    statusChangedAt: user.statusChangedAt,
    suspendedUntil: user.suspendedUntil,
    sellerStatus: user.sellerStatus,
    verified: user.verified,
    createdAt: user.createdAt,
  };
}

export class UserDetailResponseDto extends UserResponseDto {
  @ApiProperty() contractsAsBuyerCount!: number;
  @ApiProperty() contractsAsSellerCount!: number;
  @ApiProperty() paymentsCount!: number;
}
