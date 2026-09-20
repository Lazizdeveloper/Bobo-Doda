import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

/** Buyer — faqat o'z to'lovlari bo'yicha filtrlaydi (egalik query-scope'da alohida majburlanadi). */
export class ListPaymentsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contractId?: string;
}

/** Staff — qo'shimcha `payerUserId`/`provider` filtri (bo'lim 55). */
export class StaffListPaymentsQueryDto extends ListPaymentsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payerUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;
}
