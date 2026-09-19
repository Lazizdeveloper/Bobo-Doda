import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Payout } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { DomainError, InvariantViolationError, NotFoundError } from '@/common/errors/domain-error';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';
import { OutboxService } from '@/common/outbox/outbox.service';
import { somToTiyin } from '@/common/money/money.util';
import { SUPPORTED_PAYMENT_CURRENCIES } from '@/common/money/currency.constant';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';
import { LedgerService } from '@/modules/ledger/ledger.service';
import {
  PAYOUT_PROVIDER,
  type PayoutProvider,
  type VerifiedPayoutWebhookEvent,
} from './providers/payout-provider.interface';
import { PAYOUT_NON_TERMINAL_STATUSES } from './payout.constants';

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const CURRENCY = SUPPORTED_PAYMENT_CURRENCIES[0];

const SYSTEM_ACTOR: AuditActor = { id: null, type: 'SYSTEM', name: 'payout-provider' };

type PayoutEventOutcome = 'APPLIED' | 'NOOP_ALREADY_TARGET' | 'MISMATCH' | 'UNKNOWN_PAYOUT' | 'CONFLICT';

/**
 * `Payout` — bo'lim 19-35: seller `SELLER_PAYABLE` balansidan RESERV
 * qilingan mablag'ni tashqi providerga chiqaradi. **Reservation DARHOL**
 * (Payout yaratilgan zahoti, tashqi chaqiruvdan OLDIN — bo'lim 23/25/50):
 * ikkinchi parallel so'rov shu pulni QAYTA ISHLATA OLMAYDI, chunki
 * `LedgerService.lockSellerPayableBalance()` `FOR UPDATE` orqali serializatsiya
 * qiladi (bo'lim 22/26/62 — eng muhim payout testi).
 */
@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly ledger: LedgerService,
    @Inject(PAYOUT_PROVIDER) private readonly provider: PayoutProvider,
  ) {}

  // ── Yaratish (reservation, atomik) ───────────────────────────────────

  async create(sellerId: string, amountSom: number, destinationReference: string, actor: AuditActor): Promise<Payout> {
    const amountTiyin = somToTiyin(amountSom);
    const payoutId = this.ids.next();

    let payout: Payout;
    try {
      payout = await this.prisma.$transaction(async (tx) => {
        // Bo'lim 22/26/62 — `FOR UPDATE` qulf ostida balans tekshiruvi:
        // ikkinchi parallel `create()` shu qulf BO'SHAGUNCHA kuta turadi,
        // keyin ALLAQACHON kamaytirilgan balansni ko'radi.
        const { balance } = await this.ledger.lockSellerPayableBalance(tx, sellerId, CURRENCY);
        if (amountTiyin > balance) {
          throw new DomainError('INSUFFICIENT_BALANCE', 'Yechish mumkin bo‘lgan balans yetarli emas');
        }

        const created = await tx.payout.create({
          data: {
            id: payoutId,
            sellerId,
            amount: amountTiyin,
            currency: CURRENCY,
            destinationReference,
            provider: this.provider.name,
            status: 'PENDING',
          },
        });
        await this.audit.record(
          {
            actor,
            action: 'PAYOUT_CREATED',
            resourceType: 'PAYOUT',
            resourceId: payoutId,
            contextId: sellerId,
            newState: { status: 'PENDING', amount: amountTiyin.toString(), currency: CURRENCY },
          },
          tx,
        );

        const reservation = await this.ledger.reservePayout(tx, created);
        if (reservation) {
          await this.audit.record(
            {
              actor: SYSTEM_ACTOR,
              action: 'LEDGER_PAYOUT_RESERVED',
              resourceType: 'LEDGER_TRANSACTION',
              resourceId: reservation.id,
              contextId: payoutId,
              newState: { sellerId, amount: amountTiyin.toString(), currency: CURRENCY },
            },
            tx,
          );
        }
        await this.outbox.enqueue(
          { aggregateType: 'PAYOUT', aggregateId: payoutId, eventType: 'PAYOUT_RESERVED', payload: { sellerId } },
          tx,
        );

        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        // Amalda bo'lmasligi kerak (`payout.id` — yangi UUIDv7) — himoya sifatida.
        throw new InvariantViolationError('Payout yaratishda kutilmagan konflikt', { payoutId });
      }
      throw err;
    }

    // Bo'lim 29 — provider HTTP chaqiruvi DB tranzaksiyasi TASHQARISIDA.
    return this.callProviderAndAdvance(payout);
  }

  private async callProviderAndAdvance(payout: Payout): Promise<Payout> {
    let result;
    try {
      result = await this.provider.createPayout({
        payoutId: payout.id,
        sellerId: payout.sellerId,
        destinationReference: payout.destinationReference,
        amountTiyin: payout.amount,
        currency: payout.currency,
      });
    } catch (err) {
      if (err instanceof DomainError && err.code === 'PAYOUT_PROVIDER_ERROR') {
        // Deterministik rad — provider ANIQ hech narsa yaratmadi, xavfsiz
        // FAILED + rezervatsiya release (bo'lim 31).
        await this.markFailed(payout.id, err.message);
      }
      // `PAYOUT_PROVIDER_UNAVAILABLE` (ambiguous) — Payout ATAYLAB PENDING'da
      // qoladi, mablag' PAYOUT_CLEARING'da rezerv holicha qoladi (bo'lim 48:
      // ko'r-ko'rona qayta chaqirilmaydi/release qilinmaydi).
      throw err;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.payout.updateMany({
        where: { id: payout.id, status: 'PENDING' },
        data: { status: 'PROCESSING', providerPayoutId: result.providerPayoutId, processingAt: new Date() },
      });
      if (cas.count === 0) return null;
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYOUT_PROCESSING',
          resourceType: 'PAYOUT',
          resourceId: payout.id,
          contextId: payout.sellerId,
          previousState: { status: 'PENDING' },
          newState: { status: 'PROCESSING' },
        },
        tx,
      );
      return tx.payout.findUniqueOrThrow({ where: { id: payout.id } });
    });
    return updated ?? (await this.prisma.payout.findUniqueOrThrow({ where: { id: payout.id } }));
  }

  private async markFailed(payoutId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const cas = await tx.payout.updateMany({
        where: { id: payoutId, status: 'PENDING' },
        data: { status: 'FAILED', failedAt: new Date(), failureReason: reason },
      });
      if (cas.count === 0) return;
      const failed = await tx.payout.findUniqueOrThrow({ where: { id: payoutId } });

      const release = await this.ledger.releasePayout(tx, failed);
      if (release) {
        await this.audit.record(
          {
            actor: SYSTEM_ACTOR,
            action: 'LEDGER_PAYOUT_RELEASED',
            resourceType: 'LEDGER_TRANSACTION',
            resourceId: release.id,
            contextId: payoutId,
            newState: { sellerId: failed.sellerId, amount: failed.amount.toString() },
          },
          tx,
        );
      }
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYOUT_FAILED',
          resourceType: 'PAYOUT',
          resourceId: payoutId,
          contextId: failed.sellerId,
          previousState: { status: 'PENDING' },
          newState: { status: 'FAILED' },
        },
        tx,
      );
      await this.outbox.enqueue(
        { aggregateType: 'PAYOUT', aggregateId: payoutId, eventType: 'PAYOUT_FAILED', payload: { sellerId: failed.sellerId } },
        tx,
      );
      await this.outbox.enqueue(
        {
          aggregateType: 'PAYOUT',
          aggregateId: payoutId,
          eventType: 'SELLER_FUNDS_RELEASED',
          payload: { sellerId: failed.sellerId, amount: failed.amount.toString() },
        },
        tx,
      );
    });
  }

  // ── O'qish (egalik query-scope'da) ───────────────────────────────────

  async getSellerOwnedOrThrow(id: string, sellerId: string): Promise<Payout> {
    const payout = await this.prisma.payout.findFirst({ where: { id, sellerId } });
    if (!payout) throw new NotFoundError('Payout topilmadi', 'PAYOUT_NOT_FOUND');
    return payout;
  }

  async getByIdOrThrow(id: string): Promise<Payout> {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundError('Payout topilmadi', 'PAYOUT_NOT_FOUND');
    return payout;
  }

  async listForSeller(sellerId: string, page: number, perPage: number, status?: Payout['status']): Promise<Page<Payout>> {
    return this.list({ sellerId, status }, page, perPage);
  }

  async listForStaff(
    filters: { status?: Payout['status']; sellerId?: string },
    page: number,
    perPage: number,
  ): Promise<Page<Payout>> {
    return this.list(filters, page, perPage);
  }

  private async list(where: Prisma.PayoutWhereInput, page: number, perPage: number): Promise<Page<Payout>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payout.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.payout.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  // ── Webhook ───────────────────────────────────────────────────────────

  /**
   * Bo'lim 28 — imzo/provider-kalit tekshiruvi `PayoutWebhookController`da
   * (`PaymentWebhookController` bilan BIR XIL naqsh, lekin ALOHIDA route/provider).
   */
  async handleWebhookEvent(event: VerifiedPayoutWebhookEvent): Promise<{ outcome: PayoutEventOutcome }> {
    const payout = await this.prisma.payout.findFirst({
      where: { provider: this.provider.name, providerPayoutId: event.providerPayoutId },
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const outcome = await this.applyEvent(tx, payout, event);
        await tx.payoutProviderEvent.create({
          data: {
            id: this.ids.next(),
            payoutId: payout?.id ?? null,
            provider: this.provider.name,
            providerEventId: event.providerEventId,
            eventType: event.eventType,
            outcome,
            processedAt: new Date(),
          },
        });
        return { outcome };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return { outcome: 'NOOP_ALREADY_TARGET' };
      }
      throw err;
    }
  }

  private async applyEvent(
    tx: Prisma.TransactionClient,
    payout: Payout | null,
    event: VerifiedPayoutWebhookEvent,
  ): Promise<PayoutEventOutcome> {
    if (!payout) return 'UNKNOWN_PAYOUT';

    if (payout.currency !== event.currency || payout.amount !== event.amountTiyin) {
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYOUT_WEBHOOK_MISMATCH',
          resourceType: 'PAYOUT',
          resourceId: payout.id,
          contextId: payout.sellerId,
          previousState: { amount: payout.amount.toString(), currency: payout.currency },
          newState: { amount: event.amountTiyin.toString(), currency: event.currency },
        },
        tx,
      );
      return 'MISMATCH';
    }

    return this.applyTerminalStatus(tx, payout, event.status, 'WEBHOOK');
  }

  /**
   * Bosqich 9, bo'lim 13/76 — CAS + (FAILED bo'lsa) `PAYOUT_RELEASE` +
   * audit + outbox: webhook VA reconciliation IKKALASI ham shu BITTA
   * metodni chaqiradi. Mustaqil "reconcile ledger" matematikasi YOZILMAYDI.
   */
  private async applyTerminalStatus(
    tx: Prisma.TransactionClient,
    payout: Payout,
    status: 'SUCCEEDED' | 'FAILED',
    source: 'WEBHOOK' | 'RECONCILIATION',
  ): Promise<PayoutEventOutcome> {
    if (!PAYOUT_NON_TERMINAL_STATUSES.includes(payout.status)) {
      if (payout.status === status) return 'NOOP_ALREADY_TARGET';
      return this.recordContradiction(tx, payout, status, source);
    }

    const cas = await tx.payout.updateMany({
      where: { id: payout.id, status: { in: ['PENDING', 'PROCESSING'] } },
      data:
        status === 'SUCCEEDED'
          ? { status: 'SUCCEEDED', succeededAt: new Date() }
          : { status: 'FAILED', failedAt: new Date(), failureReason: `Provider ${source === 'WEBHOOK' ? 'webhook' : 'reconciliation'}: FAILED` },
    });
    if (cas.count === 0) {
      const fresh = await tx.payout.findUniqueOrThrow({ where: { id: payout.id } });
      if (fresh.status === status) return 'NOOP_ALREADY_TARGET';
      return this.recordContradiction(tx, { ...payout, status: fresh.status }, status, source);
    }

    if (status === 'SUCCEEDED') {
      // Bo'lim 30/41 — HECH QANDAY qo'shimcha ledger yozuvi YO'Q: mablag'
      // reservation vaqtida ALLAQACHON SELLER_PAYABLE'dan PAYOUT_CLEARING'ga
      // o'tgan (PAYMENT_CLEARING bilan bir xil simmetriya — schema izohiga qarang).
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYOUT_SUCCEEDED',
          resourceType: 'PAYOUT',
          resourceId: payout.id,
          contextId: payout.sellerId,
          previousState: { status: payout.status },
          newState: { status: 'SUCCEEDED' },
        },
        tx,
      );
      await this.outbox.enqueue(
        { aggregateType: 'PAYOUT', aggregateId: payout.id, eventType: 'PAYOUT_SUCCEEDED', payload: { sellerId: payout.sellerId } },
        tx,
      );
    } else {
      // Bo'lim 31/32 — FAILED: rezervatsiya RELEASE qilinadi (birinchi
      // haqiqiy reversal — original PAYOUT_RESERVATION o'zgartirilmaydi).
      const release = await this.ledger.releasePayout(tx, payout);
      if (release) {
        await this.audit.record(
          {
            actor: SYSTEM_ACTOR,
            action: 'LEDGER_PAYOUT_RELEASED',
            resourceType: 'LEDGER_TRANSACTION',
            resourceId: release.id,
            contextId: payout.id,
            newState: { sellerId: payout.sellerId, amount: payout.amount.toString() },
          },
          tx,
        );
      }
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYOUT_FAILED',
          resourceType: 'PAYOUT',
          resourceId: payout.id,
          contextId: payout.sellerId,
          previousState: { status: payout.status },
          newState: { status: 'FAILED' },
        },
        tx,
      );
      await this.outbox.enqueue(
        { aggregateType: 'PAYOUT', aggregateId: payout.id, eventType: 'PAYOUT_FAILED', payload: { sellerId: payout.sellerId } },
        tx,
      );
      await this.outbox.enqueue(
        {
          aggregateType: 'PAYOUT',
          aggregateId: payout.id,
          eventType: 'SELLER_FUNDS_RELEASED',
          payload: { sellerId: payout.sellerId, amount: payout.amount.toString() },
        },
        tx,
      );
    }
    return 'APPLIED';
  }

  /**
   * Bosqich 9, bo'lim 13/76 — reconciliation query natijasi asosida SHU
   * BITTA (webhook bilan bir xil) yo'l orqali qo'llaydi.
   */
  async applyReconciledStatus(
    tx: Prisma.TransactionClient,
    payout: Payout,
    status: 'SUCCEEDED' | 'FAILED',
  ): Promise<PayoutEventOutcome> {
    return this.applyTerminalStatus(tx, payout, status, 'RECONCILIATION');
  }

  private async recordContradiction(
    tx: Prisma.TransactionClient,
    payout: Payout,
    attemptedStatus: string,
    source: 'WEBHOOK' | 'RECONCILIATION',
  ): Promise<PayoutEventOutcome> {
    await this.audit.record(
      {
        actor: SYSTEM_ACTOR,
        action: 'PAYOUT_WEBHOOK_CONFLICT',
        resourceType: 'PAYOUT',
        resourceId: payout.id,
        contextId: payout.sellerId,
        previousState: { status: payout.status },
        newState: { attemptedStatus, source },
      },
      tx,
    );
    return 'CONFLICT';
  }
}
