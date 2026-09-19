import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { OutboxService } from '../outbox/outbox.service';

/** Audit + Outbox — Bosqich 3'dan boshlab HAR domen moduli ishlatadi (global). */
@Global()
@Module({
  providers: [AuditService, OutboxService],
  exports: [AuditService, OutboxService],
})
export class AuditModule {}
