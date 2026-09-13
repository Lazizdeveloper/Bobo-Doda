import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, OutboxDeliveryAttemptStatus, type OutboxDeliveryAttempt } from '@prisma/client';

export class OutboxDeliveryAttemptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() attemptNumber!: number;
  @ApiProperty({ enum: NotificationChannel }) channel!: NotificationChannel;
  @ApiProperty() provider!: string;
  @ApiProperty({ enum: OutboxDeliveryAttemptStatus }) status!: OutboxDeliveryAttemptStatus;
  @ApiPropertyOptional() errorCode?: string | null;
  @ApiPropertyOptional() providerMessageId?: string | null;
  @ApiProperty() startedAt!: Date;
  @ApiProperty() completedAt!: Date;
}

export function toOutboxDeliveryAttemptResponseDto(attempt: OutboxDeliveryAttempt): OutboxDeliveryAttemptResponseDto {
  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    channel: attempt.channel,
    provider: attempt.provider,
    status: attempt.status,
    errorCode: attempt.errorCode,
    providerMessageId: attempt.providerMessageId,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
  };
}
