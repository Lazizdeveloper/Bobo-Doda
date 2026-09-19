import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { CurrentStaff } from '@/modules/staff-auth/decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import { PageQueryDto } from '@/common/pagination/page-query.dto';
import { CategoryService } from './category.service';
import { CategoryResponseDto, toCategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { Page } from '@/common/pagination/page-query.dto';

/**
 * Staff boshqaruvi — `CATEGORIES` huquqi (mavjud `StaffPermission`, yangi
 * qo'shilmagan). Hard delete YO'Q — `archive`/`activate` (referential
 * integrity, `Service.categoryId`).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-categories')
@Controller('staff/categories')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('CATEGORIES')
export class StaffCategoryController {
  constructor(
    private readonly categories: CategoryService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: PageQueryDto): Promise<Page<CategoryResponseDto>> {
    const page = await this.categories.listForStaff(query.page ?? 1, query.perPage ?? 20);
    return { ...page, items: page.items.map(toCategoryResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  async get(@Param('id') id: string): Promise<CategoryResponseDto> {
    return toCategoryResponseDto(await this.categories.getByIdOrThrow(id));
  }

  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: CategoryResponseDto })
  async create(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toCategoryResponseDto(await this.categories.create(dto, actor));
  }

  @Patch(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return toCategoryResponseDto(await this.categories.update(id, dto));
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOkResponse({ type: CategoryResponseDto })
  async archive(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
  ): Promise<CategoryResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toCategoryResponseDto(await this.categories.archive(id, actor));
  }

  @Post(':id/activate')
  @HttpCode(200)
  @ApiOkResponse({ type: CategoryResponseDto })
  async activate(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
  ): Promise<CategoryResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toCategoryResponseDto(await this.categories.activate(id, actor));
  }
}
