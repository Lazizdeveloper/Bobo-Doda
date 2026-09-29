import { ApiPropertyOptional } from '@nestjs/swagger';
import { SellerApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

/**
 * `GET /staff/seller-applications` — xuddi `StaffListServicesQueryDto`dagi
 * bilan bir xil topilma: ilgari `PageQueryDto & { status?: 'PENDING' |
 * 'APPROVED' | 'REJECTED' }` (TS intersection) `Object` metatype'ga
 * yozilib, ValidationPipe'ni butunlay chetlab o'tardi. Real Prisma enum
 * (`SellerApplicationStatus` — aynan shu uchta qiymat) endi `@IsEnum`
 * bilan tekshiriladi.
 */
export class StaffListSellerApplicationsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: SellerApplicationStatus })
  @IsOptional()
  @IsEnum(SellerApplicationStatus)
  status?: SellerApplicationStatus;
}
