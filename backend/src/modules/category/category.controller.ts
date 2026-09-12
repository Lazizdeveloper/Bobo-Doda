import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { CategoryService } from './category.service';
import { CategoryResponseDto, toCategoryResponseDto } from './dto/category-response.dto';

/** Public katalog — faqat ACTIVE. Staff boshqaruvi — `StaffCategoryController`. */
@Public()
@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  @Get()
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  async list(): Promise<CategoryResponseDto[]> {
    const categories = await this.categories.listPublic();
    return categories.map(toCategoryResponseDto);
  }
}
