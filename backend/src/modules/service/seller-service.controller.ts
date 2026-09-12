import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AccountStatusGuard } from '@/common/guards/account-status.guard';
import { SellerEligibilityGuard } from '@/common/guards/seller-eligibility.guard';
import { PageQueryDto } from '@/common/pagination/page-query.dto';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponseDto, toServiceResponseDto } from './dto/service-response.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/**
 * Sotuvchi o'z xizmatlarini boshqaradi. `@Roles(Role.SELLER)` — ADR-04
 * kontekst tekshiruvi (sessiya HOZIR seller kabinetida). `POST` (yaratish)
 * QO'SHIMCHA `SellerEligibilityGuard` talab qiladi — "role=SELLER" LAYOQAT,
 * "APPROVED" esa HAQIQIY faoliyat huquqi (spec: ikkalasi mustaqil).
 */
@ApiBearerAuth()
@ApiTags('seller-services')
@Controller('seller/services')
@UseGuards(RolesGuard, AccountStatusGuard)
@Roles(Role.SELLER)
export class SellerServiceController {
  constructor(private readonly services: ServiceService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(SellerEligibilityGuard)
  @ApiOkResponse({ type: ServiceResponseDto })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.services.createDraft(user.sub, dto);
    return toServiceResponseDto(service);
  }

  @Get()
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: PageQueryDto,
  ): Promise<Page<ServiceResponseDto>> {
    const page = await this.services.listMine(user.sub, query.page ?? 1, query.perPage ?? 20);
    return { ...page, items: page.items.map(toServiceResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: ServiceResponseDto })
  async get(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    const service = await this.services.getOwnedOrThrow(id, user.sub);
    return toServiceResponseDto(service);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ServiceResponseDto })
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.services.update(id, user.sub, dto);
    return toServiceResponseDto(service);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @ApiOkResponse({ type: ServiceResponseDto })
  async submit(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.services.submit(id, user.sub));
  }

  @Post(':id/pause')
  @HttpCode(200)
  @ApiOkResponse({ type: ServiceResponseDto })
  async pause(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.services.pause(id, user.sub));
  }

  @Post(':id/resume')
  @HttpCode(200)
  @ApiOkResponse({ type: ServiceResponseDto })
  async resume(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.services.resume(id, user.sub));
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOkResponse({ type: ServiceResponseDto })
  async archive(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.services.archive(id, user.sub));
  }
}
