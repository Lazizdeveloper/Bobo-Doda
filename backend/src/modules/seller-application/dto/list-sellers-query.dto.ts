import { ApiPropertyOptional } from '@nestjs/swagger';
import { SellerStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListSellersQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: SellerStatus })
  @IsOptional()
  @IsEnum(SellerStatus)
  sellerStatus?: SellerStatus;
}
