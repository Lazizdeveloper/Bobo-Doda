import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffPermission, StaffRole, StaffStatus, type StaffMember } from '@prisma/client';

/**
 * Bo'lim 49 — `passwordHash`/`totpSecret`/`pendingTotpSecret`/
 * `lastTotpCounter` HECH QACHON qaytarilmaydi.
 */
export class StaffMemberResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: StaffRole }) role!: StaffRole;
  @ApiProperty({ enum: StaffPermission, isArray: true }) permissions!: StaffPermission[];
  @ApiProperty({ enum: StaffStatus }) status!: StaffStatus;
  @ApiPropertyOptional() statusReason?: string | null;
  @ApiPropertyOptional() statusChangedAt?: Date | null;
  @ApiProperty() mfaEnabled!: boolean;
  @ApiProperty() mustChangePassword!: boolean;
  @ApiPropertyOptional() lastLoginAt?: Date | null;
  @ApiProperty() createdAt!: Date;
}

export function toStaffMemberResponseDto(member: StaffMember): StaffMemberResponseDto {
  return {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    title: member.title,
    role: member.role,
    permissions: member.permissions,
    status: member.status,
    statusReason: member.statusReason,
    statusChangedAt: member.statusChangedAt,
    mfaEnabled: member.mfaEnabled,
    mustChangePassword: member.mustChangePassword,
    lastLoginAt: member.lastLoginAt,
    createdAt: member.createdAt,
  };
}
