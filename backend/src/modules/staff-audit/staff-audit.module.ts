import { Module } from '@nestjs/common';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { StaffAuditLogController } from './staff-audit-log.controller';

/** `AuditService` — global `AuditModule`dan, alohida import shart emas. */
@Module({
  imports: [StaffAuthModule],
  controllers: [StaffAuditLogController],
})
export class StaffAuditModule {}
