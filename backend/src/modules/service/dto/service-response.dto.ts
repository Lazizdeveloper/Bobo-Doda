import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus, type Service } from '@prisma/client';
import { tiyinToSom } from '@/common/money/money.util';

/** Egasi/staff ko'rinishi — moderatsiya maydonlari (rejectionReason) bilan. */
export class ServiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sellerId!: string;
  @ApiProperty() categoryId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() lang!: string;
  @ApiProperty({ description: 'Butun so‘m' }) price!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() deliveryDays!: number;
  @ApiProperty({ enum: ServiceStatus }) status!: ServiceStatus;
  @ApiPropertyOptional({ nullable: true }) submittedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) reviewedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) rejectionReason!: string | null;
  @ApiPropertyOptional({ nullable: true }) publishedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** Prisma model → DTO — `price` BigInt→so'm chegara konvertatsiyasi shu YAGONA joyda. */
export function toServiceResponseDto(service: Service): ServiceResponseDto {
  return {
    id: service.id,
    sellerId: service.sellerId,
    categoryId: service.categoryId,
    title: service.title,
    description: service.description,
    lang: service.lang,
    price: tiyinToSom(service.price),
    currency: service.currency,
    deliveryDays: service.deliveryDays,
    status: service.status,
    submittedAt: service.submittedAt,
    reviewedAt: service.reviewedAt,
    rejectionReason: service.rejectionReason,
    publishedAt: service.publishedAt,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

/**
 * Public ko'rinish — moderatsiya ICHKI maydonlari (`rejectionReason`,
 * `submittedAt`, `reviewedAt`) CHIQARILMAYDI (bo'lim 22: "internal
 * moderation-only notes public API'da chiqmasin").
 */
export class PublicServiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sellerId!: string;
  @ApiProperty() categoryId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() lang!: string;
  @ApiProperty({ description: 'Butun so‘m' }) price!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() deliveryDays!: number;
  @ApiPropertyOptional({ nullable: true }) publishedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export function toPublicServiceResponseDto(service: Service): PublicServiceResponseDto {
  return {
    id: service.id,
    sellerId: service.sellerId,
    categoryId: service.categoryId,
    title: service.title,
    description: service.description,
    lang: service.lang,
    price: tiyinToSom(service.price),
    currency: service.currency,
    deliveryDays: service.deliveryDays,
    publishedAt: service.publishedAt,
    createdAt: service.createdAt,
  };
}
