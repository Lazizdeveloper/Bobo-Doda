import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { ServiceService } from './service.service';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { PublicServiceResponseDto, toPublicServiceResponseDto } from './dto/service-response.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/**
 * Ochiq bozor — autentifikatsiyasiz. Faqat `status=ACTIVE` (`ServiceService`
 * query darajasida majburlaydi — DRAFT/PENDING_REVIEW/REJECTED/PAUSED/
 * ARCHIVED bu yo'l bilan HECH QACHON chiqmaydi).
 */
@Public()
@ApiTags('marketplace')
@Controller('services')
export class ServiceController {
  constructor(private readonly services: ServiceService) {}

  @Get()
  async list(@Query() query: ListServicesQueryDto): Promise<Page<PublicServiceResponseDto>> {
    const page = await this.services.listPublic(query);
    return { ...page, items: page.items.map(toPublicServiceResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: PublicServiceResponseDto })
  async get(@Param('id') id: string): Promise<PublicServiceResponseDto> {
    const service = await this.services.getPublicOrThrow(id);
    return toPublicServiceResponseDto(service);
  }
}
