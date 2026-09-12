import { Injectable } from '@nestjs/common';
import type { AuditActorType, Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';

/** Bir marta yozib qo'yiladigan actor ma'lumoti — har chaqiruvda takrorlanmasin. */
export interface AuditActor {
  id: string | null;
  type: AuditActorType;
  name: string;
}

export interface AuditWriteInput {
  actor: AuditActor;
  action: string;
  resourceType: string;
  resourceId: string;
  contextId?: string;
  previousState?: Prisma.InputJsonValue;
  newState?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * `AuditLog` — YAGONA yozish yo'li (Bosqich 3'da BIRINCHI marta ishlatiladi;
 * jadvalning o'zi Bosqich 1'dan bor). Append-only invariant DB DARAJASIDA
 * majburlangan (A4 — `bobododa_app`dan `UPDATE`/`DELETE` REVOKE qilingan,
 * `APPEND_ONLY_TABLES`), shuning uchun bu servis ham faqat `create()` beradi
 * — `update`/`delete` metodlari ATAYLAB YO'Q.
 *
 * Sensitive ma'lumot (masalan xom KYC maydonlari) `previousState`/`newState`
 * ga QO'YILMASIN — chaqiruvchi tomon tanlab beradi (bu servis filtrlashni
 * o'zi qilmaydi, chunki "sensitive nima" resursga xos qaror).
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
  ) {}

  /**
   * `tx` — Prisma transaction client bo'lishi mumkin (business update bilan
   * BITTA tranzaksiyada yozish uchun — talab: "business update + AuditLog +
   * OutboxEvent bir atomic transaction'da").
   */
  async record(
    input: AuditWriteInput,
    tx: Pick<PrismaService, 'auditLog'> = this.prisma,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        id: this.ids.next(),
        actorId: input.actor.id,
        actorType: input.actor.type,
        actorName: input.actor.name,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        contextId: input.contextId,
        previousState: input.previousState,
        newState: input.newState,
        ip: input.ip,
        userAgent: input.userAgent,
        requestId: input.requestId,
      },
    });
  }

  /**
   * Staff JWT'da `fullName` YO'Q (minimal claim — Bosqich 2 dizayni), lekin
   * `AuditLog.actorName` majburiy — shuning uchun har staff-actioned yozuvdan
   * oldin shu YAGONA joydan olinadi (har controller/servisda takrorlanmasin).
   */
  async resolveStaffActor(staffId: string): Promise<AuditActor> {
    const staff = await this.prisma.staffMember.findUniqueOrThrow({
      where: { id: staffId },
      select: { id: true, fullName: true },
    });
    return { id: staff.id, type: 'STAFF', name: staff.fullName };
  }

  /** `User.fullName` NULL bo'lishi mumkin (Bosqich 2 — profil hali to'ldirilmagan). */
  async resolveUserActor(userId: string): Promise<AuditActor> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, fullName: true, phone: true },
    });
    return { id: user.id, type: 'USER', name: user.fullName ?? user.phone };
  }
}
