import { ApiProperty } from '@nestjs/swagger';
import { StaffPermission, StaffRole } from '@prisma/client';
import { ArrayUnique, IsArray, IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStaffMemberDto {
  @ApiProperty({ example: 'ops@bobododa.uz' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role!: StaffRole;

  @ApiProperty({ enum: StaffPermission, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(StaffPermission, { each: true })
  permissions!: StaffPermission[];
}
