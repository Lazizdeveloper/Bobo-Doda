import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutboxStatus, type OutboxDeliveryAttempt, type OutboxEvent } from '@prisma/client';
import { OutboxDeliveryAttemptResponseDto, toOutboxDeliveryAttemptResponseDto } from './outbox-delivery-attempt-response.dto';

/**
 * Bo'lim 27 — staff'ga `payload`ning O'ZI ko'rsatiladi (`processingToken`
 * EMAS — ichki implementatsiya detali). Bo'lim 14's minimal-payload
 * konvensiyasi tufayli bu yerda sir/xom entity dump YO'Q.
 */
export class OutboxEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() aggregateType!: string;
  @ApiProperty() aggregateId!: string;
  @ApiProperty() eventType!: string;
  @ApiProperty() payload!: unknown;
  @ApiProperty() payloadVersion!: number;
  @ApiProperty({ enum: OutboxStatus }) status!: OutboxStatus;
  @ApiProperty() attempts!: number;
  @ApiPropertyOptional() lastError?: string | null;
  @ApiPropertyOptional() lastErrorCode?: string | null;
  @ApiProperty() availableAt!: Date;
  @ApiPropertyOptional() processedAt?: Date | null;
  @ApiProperty() createdAt!: Date;
}

export function toOutboxEventResponseDto(event: OutboxEvent): OutboxEventResponseDto {
  return {
    id: event.id,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    eventType: event.eventType,
    payload: event.payload,
    payloadVersion: event.payloadVersion,
    status: event.status,
    attempts: event.attempts,
    lastError: event.lastError,
    lastErrorCode: event.lastErrorCode,
    availableAt: event.availableAt,
    processedAt: event.processedAt,
    createdAt: event.createdAt,
  };
}

export class OutboxEventDetailResponseDto extends OutboxEventResponseDto {
  @ApiProperty({ type: [OutboxDeliveryAttemptResponseDto] }) deliveryAttempts!: OutboxDeliveryAttemptResponseDto[];
}

export function toOutboxEventDetailResponseDto(
  event: OutboxEvent & { deliveryAttempts: OutboxDeliveryAttempt[] },
): OutboxEventDetailResponseDto {
  return {
    ...toOutboxEventResponseDto(event),
    deliveryAttempts: event.deliveryAttempts.map(toOutboxDeliveryAttemptResponseDto),
  };
}
