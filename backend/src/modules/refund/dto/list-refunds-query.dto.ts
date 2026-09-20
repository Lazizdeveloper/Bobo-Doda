import { ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListRefundsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;
}

/** Staff — qo'shimcha `contractId`/`paymentId` filtri. */
export class StaffListRefundsQueryDto extends ListRefundsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;
}
