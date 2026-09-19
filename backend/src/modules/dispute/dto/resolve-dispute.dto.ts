import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

/**
 * Bo'lim 20/21/65 — foiz EMAS, TO'G'RIDAN-TO'G'RI aniq minor-unit (butun
 * so'm) summalar: `buyerAwardAmount + sellerAwardAmount === dispute.
 * heldAmount` invarianti SERVIS darajasida tekshiriladi (`dispute.
 * heldAmount` — client/staff bilmaydigan, serverda hisoblangan ceiling,
 * bo'lim 21: "Client hech qachon ledger entry yaratmaydi/summani
 * tanlamaydi" tamoyilining davomi — staff FAQAT taqsimotni tanlaydi,
 * YOG'INGI summani EMAS).
 */
export class ResolveDisputeDto {
  @ApiProperty({ description: 'Butun so‘m', minimum: 0 })
  @IsInt()
  @Min(0)
  buyerAwardAmount!: number;

  @ApiProperty({ description: 'Butun so‘m', minimum: 0 })
  @IsInt()
  @Min(0)
  sellerAwardAmount!: number;

  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  resolutionReason!: string;
}
