import { Module } from '@nestjs/common';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { CategoryController } from './category.controller';
import { StaffCategoryController } from './staff-category.controller';
import { CategoryService } from './category.service';

@Module({
  // `StaffAuthModule` `StaffJwtAuthGuard`/`StaffPermissionGuard` export
  // qiladi — `StaffCategoryController` shu ikkalasini `@UseGuards`da ishlatadi.
  imports: [StaffAuthModule],
  controllers: [CategoryController, StaffCategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
