import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MAX_SOM } from '@/common/money/money.util';

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'Kategoriya ID noto‘g‘ri' })
  categoryId?: string;

  @ApiPropertyOptional({ minLength: 5, maxLength: 200 })
  @IsOptional()
  @IsString({ message: 'Sarlavha matn bo‘lishi kerak' })
  @MinLength(5, { message: 'Sarlavha kamida 5 ta belgidan iborat bo‘lishi kerak' })
  @MaxLength(200, { message: 'Sarlavha ko‘pi bilan 200 ta belgidan oshmasligi kerak' })
  title?: string;

  @ApiPropertyOptional({ minLength: 20, maxLength: 5000 })
  @IsOptional()
  @IsString({ message: 'Tavsif matn bo‘lishi kerak' })
  @MinLength(20, { message: 'Tavsif kamida 20 ta belgidan iborat bo‘lishi kerak' })
  @MaxLength(5000, { message: 'Tavsif ko‘pi bilan 5000 ta belgidan oshmasligi kerak' })
  description?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_SOM })
  @IsOptional()
  @IsInt({ message: 'Narx butun son bo‘lishi kerak' })
  @Min(1, { message: 'Narx kamida 1 so‘m bo‘lishi kerak' })
  @Max(MAX_SOM, { message: 'Narx 10 mlrd so‘mdan oshmasligi kerak' })
  price?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @IsInt({ message: 'Muddat butun kunlarda bo‘lishi kerak' })
  @Min(1, { message: 'Muddat kamida 1 kun bo‘lishi kerak' })
  @Max(365, { message: 'Muddat ko‘pi bilan 365 kun bo‘lishi mumkin' })
  deliveryDays?: number;
}
