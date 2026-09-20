import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SellerStatus, UserStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

export class ListUsersQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: SellerStatus })
  @IsOptional()
  @IsEnum(SellerStatus)
  sellerStatus?: SellerStatus;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /**
   * Qisman (contains) qidiruv. `User.phone` HAR DOIM E.164'da saqlanadi
   * (yozishda `normalizePhone()` orqali) — QISMAN kirishni normallashtirib
   * bo'lmaydi (to'liq raqam emas), shuning uchun bu yerda oddiy substring
   * moslashtirish YETARLI (ustun allaqachon izchil formatda).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'ISO sana' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'ISO sana' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
