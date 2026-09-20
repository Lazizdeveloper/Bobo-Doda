import { ApiProperty } from '@nestjs/swagger';

/**
 * Bo'lim 25/27/34 — mutable `balance` ustuni YO'Q, har doim ledgerdan
 * hisoblanadi (`LedgerService.getUserAccountBalance`). `available`/`pending`
 * kabi bo'linish HALI YO'Q (bo'lim 27 — Payout hali yo'q, premature
 * kategoriya yaratilmadi) — bitta `SELLER_PAYABLE` balansi yetarli.
 */
export class SellerBalanceResponseDto {
  @ApiProperty() currency!: string;
  @ApiProperty({ description: 'Butun so‘m — SELLER_PAYABLE hisobidagi joriy qoldiq' })
  available!: number;
}
