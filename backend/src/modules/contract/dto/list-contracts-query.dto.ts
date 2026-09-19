import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

/** Buyer/seller — faqat o'z status'lari bo'yicha filtrlaydi (egalik query-scope'da alohida majburlanadi). */
export class ListContractsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}

/** Staff — qo'shimcha `buyerId`/`sellerId`/`serviceId` filtri (bo'lim 22). */
export class StaffListContractsQueryDto extends ListContractsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
