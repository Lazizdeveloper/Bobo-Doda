import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListPayoutsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}

/** Staff — qo'shimcha `sellerId` filtri. */
export class StaffListPayoutsQueryDto extends ListPayoutsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}
