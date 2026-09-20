import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MAX_SOM } from '@/common/money/money.util';

/** Limitlar — `lib/validate.ts#LIMITS` (title=200, description=5000) bilan bir xil. */
export class CreateServiceDto {
  @ApiProperty() @IsUUID() categoryId!: string;

  @ApiProperty({ minLength: 5, maxLength: 200 })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ minLength: 20, maxLength: 5000 })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ description: 'Butun so‘m', minimum: 1, maximum: MAX_SOM })
  @IsInt()
  @Min(1)
  @Max(MAX_SOM)
  price!: number;

  @ApiProperty({ minimum: 1, maximum: 365 })
  @IsInt()
  @Min(1)
  @Max(365)
  deliveryDays!: number;
}
