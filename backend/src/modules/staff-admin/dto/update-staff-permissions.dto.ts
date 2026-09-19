import { ApiProperty } from '@nestjs/swagger';
import { StaffPermission } from '@prisma/client';
import { ArrayUnique, IsArray, IsEnum } from 'class-validator';

export class UpdateStaffPermissionsDto {
  @ApiProperty({ enum: StaffPermission, isArray: true, description: 'TO‘LIQ ro‘yxat — mavjudlarni ALMASHTIRADI, qo‘shimcha qilmaydi' })
  @IsArray()
  @ArrayUnique()
  @IsEnum(StaffPermission, { each: true })
  permissions!: StaffPermission[];
}
