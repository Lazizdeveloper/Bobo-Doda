import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, type Payment } from '@prisma/client';
import { tiyinToSom } from '@/common/money/money.util';

/**
 * Buyer-ko'rinish — provider ICHKI detallari (bo'lim 34: "provider internal
 * details leak bo'lmasin") YO'Q: `providerPaymentId`/`payerUserId` bu yerda
 * qasddan qoldirilmagan. Staff ko'rinishi (`StaffPaymentResponseDto`) buni
 * kengaytiradi.
 */
export class PaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() contractId!: string;
  @ApiProperty() provider!: string;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty({ description: 'Butun so‘m' }) amount!: number;
  @ApiProperty() currency!: string;

  @ApiPropertyOptional() failureReason?: string | null;
  @ApiPropertyOptional() succeededAt?: Date | null;
  @ApiPropertyOptional() failedAt?: Date | null;
  @ApiPropertyOptional() cancelledAt?: Date | null;
  @ApiPropertyOptional() expiresAt?: Date | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export function toPaymentResponseDto(payment: Payment): PaymentResponseDto {
  return {
    id: payment.id,
    contractId: payment.contractId,
    provider: payment.provider,
    status: payment.status,
    amount: tiyinToSom(payment.amount),
    currency: payment.currency,
    failureReason: payment.failureReason,
    succeededAt: payment.succeededAt,
    failedAt: payment.failedAt,
    cancelledAt: payment.cancelledAt,
    expiresAt: payment.expiresAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

/** Staff — qo'shimcha traceability maydonlari (bo'lim 59: "barcha moliyaviy identifikatorlar traceable"). */
export class StaffPaymentResponseDto extends PaymentResponseDto {
  @ApiProperty() payerUserId!: string;
  @ApiPropertyOptional() providerPaymentId?: string | null;
}

export function toStaffPaymentResponseDto(payment: Payment): StaffPaymentResponseDto {
  return {
    ...toPaymentResponseDto(payment),
    payerUserId: payment.payerUserId,
    providerPaymentId: payment.providerPaymentId,
  };
}
