import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';

export interface OutboxEnqueueInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

/**
 * Outbox pattern — FAQAT yozadi. `OutboxEvent` DB tranzaksiya ICHIDA
 * (business update bilan bitta commit) yoziladi, HECH QACHON shu yerda
 * HTTP/SMS chaqiruvi qilinmaydi (`otp-sms.processor.ts` bilan bir xil
 * qoida, lekin BU YO'L UMUMIY — OTP'dan farqli, sir emas).
 *
 * **Worker BU BOSQICHDA YO'Q** — asl 11-bosqichli rejada "Bildirishnomalar/
 * Outbox Worker" Bosqich 10. Bosqich 3 vazifasi — hodisalarni TO'G'RI,
 * transactional ravishda YOZIB QO'YISH; keyinroq worker kelganda ular
 * darhol iste'mol qilinadi (jadval + `status=PENDING` allaqachon tayyor).
 */
@Injectable()
export class OutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
  ) {}

  async enqueue(
    input: OutboxEnqueueInput,
    tx: Pick<PrismaService, 'outboxEvent'> = this.prisma,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        id: this.ids.next(),
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
      },
    });
  }
}
