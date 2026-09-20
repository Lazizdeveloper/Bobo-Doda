import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditActorType, type AuditLog } from '@prisma/client';
import { redactSensitiveJson } from '@/common/audit/audit-redaction.util';

export class AuditLogResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() actorId?: string | null;
  @ApiProperty({ enum: AuditActorType }) actorType!: AuditActorType;
  @ApiProperty() actorName!: string;
  @ApiProperty() action!: string;
  @ApiProperty() resourceType!: string;
  @ApiProperty() resourceId!: string;
  @ApiPropertyOptional() contextId?: string | null;
  @ApiPropertyOptional() previousState?: unknown;
  @ApiPropertyOptional() newState?: unknown;
  @ApiPropertyOptional() ip?: string | null;
  @ApiPropertyOptional() userAgent?: string | null;
  @ApiPropertyOptional() requestId?: string | null;
  @ApiProperty() createdAt!: Date;
}

export function toAuditLogResponseDto(log: AuditLog): AuditLogResponseDto {
  return {
    id: log.id,
    actorId: log.actorId,
    actorType: log.actorType,
    actorName: log.actorName,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    contextId: log.contextId,
    previousState: redactSensitiveJson(log.previousState),
    newState: redactSensitiveJson(log.newState),
    ip: log.ip,
    userAgent: log.userAgent,
    requestId: log.requestId,
    createdAt: log.createdAt,
  };
}
