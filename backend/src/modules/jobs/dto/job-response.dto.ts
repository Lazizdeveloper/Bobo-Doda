import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus, type Job, type User, type Category } from '@prisma/client';
import { tiyinToSom } from '@/common/money/money.util';

export class JobResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() buyerId!: string;
  @ApiProperty() buyerName!: string;
  @ApiProperty() buyerRating!: number;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ description: 'Kategoriya slug' }) category!: string;
  @ApiProperty() categoryId!: string;
  @ApiProperty({ description: 'Minimal byudjet (butun so‘m)' }) budgetMin!: number;
  @ApiProperty({ description: 'Maksimal byudjet (butun so‘m)' }) budgetMax!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: [String] }) skillsRequired!: string[];
  @ApiProperty({ type: [String] }) screeningQuestions!: string[];
  @ApiProperty() proposalsCount!: number;
  @ApiProperty({ enum: ['ochiq', 'yopilgan', 'OPEN', 'CLOSED'] }) status!: 'ochiq' | 'yopilgan';
  @ApiProperty() postedAt!: string;
  @ApiPropertyOptional({ nullable: true }) deadline?: string;
  @ApiProperty({ type: [String] }) attachedImages!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type JobWithRelations = Job & {
  buyer?: Pick<User, 'id' | 'fullName'> | null;
  category?: Pick<Category, 'id' | 'slug'> | null;
};

export function toJobResponseDto(job: JobWithRelations): JobResponseDto {
  const buyerName = job.buyer?.fullName?.trim() || 'Ish beruvchi';
  const categorySlug = job.category?.slug || '';
  const statusUz: 'ochiq' | 'yopilgan' = job.status === JobStatus.OPEN ? 'ochiq' : 'yopilgan';

  return {
    id: job.id,
    buyerId: job.buyerId,
    buyerName,
    buyerRating: 5.0,
    title: job.title,
    description: job.description,
    category: categorySlug,
    categoryId: job.categoryId,
    budgetMin: tiyinToSom(job.budgetMin),
    budgetMax: tiyinToSom(job.budgetMax),
    currency: job.currency,
    skillsRequired: job.skillsRequired || [],
    screeningQuestions: job.screeningQuestions || [],
    proposalsCount: job.proposalsCount,
    status: statusUz,
    postedAt: job.createdAt.toISOString(),
    deadline: job.deadline ? job.deadline.toISOString() : undefined,
    attachedImages: job.attachedImages || [],
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
