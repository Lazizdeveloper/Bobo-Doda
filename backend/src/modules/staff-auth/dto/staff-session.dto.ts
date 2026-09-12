import { ApiProperty } from '@nestjs/swagger';
import { StaffPermission, StaffRole } from '@prisma/client';

export class StaffSessionDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ enum: StaffRole }) role!: StaffRole;
  @ApiProperty({ enum: StaffPermission, isArray: true }) permissions!: StaffPermission[];
}

export class StaffMeDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: StaffRole }) role!: StaffRole;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: StaffPermission, isArray: true }) permissions!: StaffPermission[];
  @ApiProperty() mfaEnabled!: boolean;
}
