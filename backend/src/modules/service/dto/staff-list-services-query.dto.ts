import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

/**
 * `GET /staff/services` — ilgari `@Query() query: PageQueryDto & { status?:
 * ServiceStatus }` (TS intersection) edi. `emitDecoratorMetadata` bunday
 * intersection'ni `Object` deb yozadi, Nest `ValidationPipe.toValidate()`
 * esa `Object` metatype'ni "tekshirish shart emas" deb hisoblab, BUTUN
 * so'rovni (page/perPage/status) transformatsiyasiz, validatsiyasiz
 * o'tkazib yuboradi — `perPage` satr ("1") holida Prisma'ga yetib borib,
 * `PrismaClientValidationError` bilan 500 qaytarardi (api-contract-auditor
 * + backend-engineer topilmasi, real HTTP bilan tasdiqlangan). Haqiqiy DTO
 * klassi (`ListDisputesQueryDto`/`ListSellersQueryDto` bilan bir xil
 * naqsh) muammoni tag'da tuzatadi — Nest endi haqiqiy konstruktorni
 * ko'radi va `class-transformer`/`class-validator` ishlaydi.
 */
export class StaffListServicesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;
}
