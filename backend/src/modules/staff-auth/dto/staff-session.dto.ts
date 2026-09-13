import { ApiProperty } from '@nestjs/swagger';
import { StaffPermission, StaffRole } from '@prisma/client';

export class StaffSessionDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ enum: StaffRole }) role!: StaffRole;
  @ApiProperty({ enum: StaffPermission, isArray: true }) permissions!: StaffPermission[];
  /** Bo'lim 4 — yumshoq signal, hech qanday endpointni bloklamaydi (client "parolni almashtiring" ko'rsatishi mumkin). */
  @ApiProperty() mustChangePassword!: boolean;
}

export class StaffMeDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: StaffRole }) role!: StaffRole;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: StaffPermission, isArray: true }) permissions!: StaffPermission[];
  @ApiProperty() mfaEnabled!: boolean;
  @ApiProperty() mustChangePassword!: boolean;
}
