import { ApiProperty } from '@nestjs/swagger';
import type { AuditActorType, DisputeEvent, Prisma } from '@prisma/client';

/** Bo'lim 17 — domen tarixi (workflow timeline), `AuditLog` bilan MAQSADSIZ DUPLICATE emas. */
export class DisputeEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() disputeId!: string;
  @ApiProperty() type!: string;
  @ApiProperty() actorType!: AuditActorType;
  @ApiProperty() actorName!: string;
  @ApiProperty({ type: Object, nullable: true }) metadata!: Prisma.JsonValue | null;
  @ApiProperty() createdAt!: Date;
}

export function toDisputeEventResponseDto(event: DisputeEvent): DisputeEventResponseDto {
  return {
    id: event.id,
    disputeId: event.disputeId,
    type: event.type,
    actorType: event.actorType,
    actorName: event.actorName,
    metadata: event.metadata,
    createdAt: event.createdAt,
  };
}
