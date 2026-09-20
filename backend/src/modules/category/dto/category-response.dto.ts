import { ApiProperty } from '@nestjs/swagger';
import { CategoryStatus, type Category } from '@prisma/client';

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() nameUz!: string;
  @ApiProperty() nameRu!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty({ enum: CategoryStatus }) status!: CategoryStatus;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** Prisma model → DTO — `version` (ichki optimistic-lock hisoblagichi) chiqarilmaydi. */
export function toCategoryResponseDto(category: Category): CategoryResponseDto {
  return {
    id: category.id,
    slug: category.slug,
    nameUz: category.nameUz,
    nameRu: category.nameRu,
    nameEn: category.nameEn,
    status: category.status,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
