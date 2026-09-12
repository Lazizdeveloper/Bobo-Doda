import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListDisputesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: DisputeStatus })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
}

/** Staff — qo'shimcha `contractId`/`buyerId`/`sellerId` filtri (bo'lim 46). */
export class StaffListDisputesQueryDto extends ListDisputesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}
