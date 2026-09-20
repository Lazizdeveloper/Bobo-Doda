import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffPermission, StaffStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListStaffMembersQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: StaffStatus })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  /** Qisman (contains, case-insensitive) qidiruv — bo'lim 56. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ enum: StaffPermission })
  @IsOptional()
  @IsEnum(StaffPermission)
  permission?: StaffPermission;

  @ApiPropertyOptional({ description: 'ISO sana' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'ISO sana' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
