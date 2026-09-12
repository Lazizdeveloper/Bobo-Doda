import { ApiPropertyOptional } from '@nestjs/swagger';
import { LedgerTransactionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListLedgerTransactionsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: LedgerTransactionType })
  @IsOptional()
  @IsEnum(LedgerTransactionType)
  type?: LedgerTransactionType;

  @ApiPropertyOptional({ description: 'Payment.id yoki Contract.id' })
  @IsOptional()
  @IsString()
  sourceId?: string;
}
