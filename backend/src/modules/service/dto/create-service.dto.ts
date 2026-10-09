import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MAX_SOM } from '@/common/money/money.util';

/** Limitlar — `lib/validate.ts#LIMITS` (title=200, description=5000) bilan bir xil. */
export class CreateServiceDto {
  @ApiProperty()
  @IsUUID('all', { message: 'Kategoriya ID noto‘g‘ri' })
  categoryId!: string;

  @ApiProperty({ minLength: 5, maxLength: 200 })
  @IsString({ message: 'Sarlavha matn bo‘lishi kerak' })
  @MinLength(5, { message: 'Sarlavha kamida 5 ta belgidan iborat bo‘lishi kerak' })
  @MaxLength(200, { message: 'Sarlavha ko‘pi bilan 200 ta belgidan oshmasligi kerak' })
  title!: string;

  @ApiProperty({ minLength: 20, maxLength: 5000 })
  @IsString({ message: 'Tavsif matn bo‘lishi kerak' })
  @MinLength(20, { message: 'Tavsif kamida 20 ta belgidan iborat bo‘lishi kerak' })
  @MaxLength(5000, { message: 'Tavsif ko‘pi bilan 5000 ta belgidan oshmasligi kerak' })
  description!: string;

  @ApiProperty({ description: 'Butun so‘m', minimum: 1, maximum: MAX_SOM })
  @IsInt({ message: 'Narx butun son bo‘lishi kerak' })
  @Min(1, { message: 'Narx kamida 1 so‘m bo‘lishi kerak' })
  @Max(MAX_SOM, { message: 'Narx 10 mlrd so‘mdan oshmasligi kerak' })
  price!: number;

  @ApiProperty({ minimum: 1, maximum: 365 })
  @IsInt({ message: 'Muddat butun kunlarda bo‘lishi kerak' })
  @Min(1, { message: 'Muddat kamida 1 kun bo‘lishi kerak' })
  @Max(365, { message: 'Muddat ko‘pi bilan 365 kun bo‘lishi mumkin' })
  deliveryDays!: number;
}
