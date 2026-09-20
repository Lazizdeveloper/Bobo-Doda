import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditActorType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListAuditLogsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: AuditActorType })
  @IsOptional()
  @IsEnum(AuditActorType)
  actorType?: AuditActorType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  resourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  resourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestId?: string;

  @ApiPropertyOptional({ description: 'ISO sana' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'ISO sana' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
