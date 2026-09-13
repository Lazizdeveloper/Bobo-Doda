import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Payment } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { DomainError, NotFoundError } from '@/common/errors/domain-error';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';
import { OutboxService } from '@/common/outbox/outbox.service';
import { assertSupportedCurrency } from '@/common/money/currency.constant';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';
import { LedgerService } from '@/modules/ledger/ledger.service';
import { PAYMENT_PROVIDER, type PaymentProvider, type VerifiedPaymentWebhookEvent } from './providers/payment-provider.interface';
import { PAYMENT_TERMINAL_STATUSES } from './payment.constants';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

/** Webhook/provider-triggered audit yozuvlari uchun — inson actor yo'q (bo'lim 25/54). */
const SYSTEM_ACTOR: AuditActor = { id: null, type: 'SYSTEM', name: 'payment-provider' };

type PaymentEventOutcome = 'APPLIED' | 'NOOP_ALREADY_TARGET' | 'MISMATCH' | 'UNKNOWN_PAYMENT' | 'CONFLICT';

/**
 * `Payment` — to'liq umr davri: yaratish (faqat `ACTIVE` Contract uchun —
 * bo'lim 1 qarori), provider chaqiruvi (DB tranzaksiyasi TASHQARISIDA —
 * bo'lim 13), webhook orqali CAS bilan terminal holatga o'tish (bo'lim 22).
 *
 * Bosqich 6 — webhook `SUCCEEDED` CAS'i g'olib bo'lganda (`applyEvent()`)
 * `LedgerService.fundPayment()` SHU BITTA tranzaksiyada chaqiriladi
 * (atomik funding, bo'lim 16). Bu servis o'zi hech qanday balans/hisob
 * mantig'ini bilmaydi — faqat `LedgerService`ga ishonadi (mas'uliyat
 * ajratilgan).
 */
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly ledger: LedgerService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  // ── Yaratish ──────────────────────────────────────────────────────────

  async create(contractId: string, buyerId: string, actor: AuditActor): Promise<Payment> {
    const contract = await this.prisma.contract.findFirst({ where: { id: contractId, buyerId } });
    if (!contract) throw new NotFoundError('Shartnoma topilmadi', 'CONTRACT_NOT_FOUND');

    // Bo'lim 42 — LIVE tekshiruv (avval o'qilgan holatga ishonilmaydi).
    // Bo'lim 1 qarori: FAQAT ACTIVE contract uchun (seller allaqachon
    // qabul qilgan) — docs'dagi "to'lov → keyin ACTIVE" ketma-ketligidan
    // ATAYLAB chetga chiqish, Phase 4 state machine'iga tegilmadi.
    if (contract.status !== 'ACTIVE') {
      throw new DomainError('PAYMENT_NOT_ALLOWED', 'Faqat faol shartnoma uchun to‘lov boshlash mumkin');
    }
    assertSupportedCurrency(contract.currency);

    // Bo'lim 5/59 — tezkor, aniqroq xato xabari uchun ilova darajasidagi
    // tekshiruv. HAQIQIY himoya — DB partial unique index
    // (`UNIQUE(contractId) WHERE status='SUCCEEDED'`, `migration.sql`).
    const existingSucceeded = await this.prisma.payment.findFirst({
      where: { contractId, status: 'SUCCEEDED' },
      select: { id: true },
    });
    if (existingSucceeded) {
      throw new DomainError('PAYMENT_ALREADY_SUCCEEDED', 'Bu shartnoma allaqachon to‘langan');
    }

    const paymentId = this.ids.next();
    let payment: Payment;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            id: paymentId,
            contractId,
            payerUserId: buyerId,
            provider: this.provider.name,
            amount: contract.agreedAmount,
            currency: contract.currency,
            status: 'PENDING',
          },
        });
        await this.audit.record(
          {
            actor,
            action: 'PAYMENT_CREATED',
            resourceType: 'PAYMENT',
            resourceId: paymentId,
            contextId: contractId,
            newState: { status: 'PENDING', amount: contract.agreedAmount.toString(), currency: contract.currency },
          },
          tx,
        );
        return created;
      });
    } catch (err) {
      // Bo'lim 35 — `UNIQUE(contractId) WHERE status='SUCCEEDED'` partial
      // index'ni ATAYLAB BUZMAYDI (yangi qator har doim PENDING bilan
      // boshlanadi) — lekin himoya sifatida: agar shu oraliqda parallel
      // so'rov muvaffaqiyatli bo'lib ulgurgan bo'lsa, aniqroq xato beramiz.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        throw new DomainError('PAYMENT_ALREADY_SUCCEEDED', 'Bu shartnoma allaqachon to‘langan');
      }
      throw err;
    }

    // Bo'lim 13 — provider HTTP chaqiruvi DB tranzaksiyasi TASHQARISIDA:
    // `Payment` allaqachon COMMIT bo'lgan, lock/connection uzoq ushlab
    // turilmaydi.
    return this.callProviderAndAdvance(payment);
  }

  private async callProviderAndAdvance(payment: Payment): Promise<Payment> {
    let result;
    try {
      result = await this.provider.createPayment({
        paymentId: payment.id,
        contractId: payment.contractId,
        amountTiyin: payment.amount,
        currency: payment.currency,
      });
    } catch (err) {
      // Bo'lim 11/59 — "provider javob bermadi" ≠ "to'lov muvaffaqiyatsiz".
      if (err instanceof DomainError && err.code === 'PAYMENT_PROVIDER_ERROR') {
        // Deterministik rad — provider ANIQ hech narsa yaratmadi, xavfsiz FAILED.
        await this.markFailed(payment.id, err.message);
      }
      // `PAYMENT_PROVIDER_UNAVAILABLE` (ambiguous) — Payment ATAYLAB PENDING'da
      // qoladi (`providerPaymentId` yo'q holda): provider aslida qabul
      // qilgan bo'lishi mumkin, ko'r-ko'rona FAILED qilinmaydi. Xato
      // `IdempotencyService` orqali xavfsiz keshlanadi (bo'lim 12) — client
      // shu javobni qayta oladi, YANGI provider chaqiruvi qilinmaydi.
      throw err;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cas = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          providerPaymentId: result.providerPaymentId,
          providerCreatedAt: result.providerCreatedAt,
        },
      });
      if (cas.count === 0) return null;
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYMENT_PROVIDER_CREATED',
          resourceType: 'PAYMENT',
          resourceId: payment.id,
          contextId: payment.contractId,
          previousState: { status: 'PENDING' },
          newState: { status: 'PROCESSING', provider: this.provider.name },
        },
        tx,
      );
      return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    });
    return updated ?? (await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }));
  }

  private async markFailed(paymentId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const cas = await tx.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status: 'FAILED', failedAt: new Date(), failureReason: reason },
      });
      if (cas.count === 0) return;
      const failed = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYMENT_FAILED',
          resourceType: 'PAYMENT',
          resourceId: paymentId,
          contextId: failed.contractId,
          previousState: { status: 'PENDING' },
          newState: { status: 'FAILED' },
        },
        tx,
      );
      await this.outbox.enqueue(
        {
          aggregateType: 'PAYMENT',
          aggregateId: paymentId,
          eventType: 'PAYMENT_FAILED',
          payload: { contractId: failed.contractId },
        },
        tx,
      );
    });
  }

  // ── O'qish (egalik query-scope'da) ───────────────────────────────────

  async getBuyerOwnedOrThrow(id: string, buyerId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({ where: { id, payerUserId: buyerId } });
    if (!payment) throw new NotFoundError('To‘lov topilmadi', 'PAYMENT_NOT_FOUND');
    return payment;
  }

  async getByIdOrThrow(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundError('To‘lov topilmadi', 'PAYMENT_NOT_FOUND');
    return payment;
  }

  async listForBuyer(
    buyerId: string,
    page: number,
    perPage: number,
    status?: Payment['status'],
    contractId?: string,
  ): Promise<Page<Payment>> {
    return this.list({ payerUserId: buyerId, status, contractId }, page, perPage);
  }

  async listForStaff(
    filters: { status?: Payment['status']; contractId?: string; payerUserId?: string; provider?: string },
    page: number,
    perPage: number,
  ): Promise<Page<Payment>> {
    return this.list(filters, page, perPage);
  }

  private async list(where: Prisma.PaymentWhereInput, page: number, perPage: number): Promise<Page<Payment>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  // ── Webhook ───────────────────────────────────────────────────────────

  /**
   * Bo'lim 15/17 — imzo/format tekshiruvi `PaymentWebhookController`da
   * (`PaymentProvider.verifyWebhook()` orqali, RAW baytlar ustida) —
   * Bosqich 7'dan boshlab bitta route (`kind`ga qarab) HAM Payment, HAM
   * Refund hodisasini qabul qiladi, shuning uchun dispatch controller
   * darajasida (bo'lim 4: ikkala domen bir-biriga bog'lanib qolmasin).
   */
  async handlePaymentEvent(event: VerifiedPaymentWebhookEvent): Promise<{ outcome: PaymentEventOutcome }> {
    const payment = await this.prisma.payment.findFirst({
      where: { provider: this.provider.name, providerPaymentId: event.providerPaymentId },
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const outcome = await this.applyEvent(tx, payment, event);

        // Bo'lim 18/19 — dedup gate BIR XIL tranzaksiyada, CAS/audit/outbox
        // dan KEYIN: agar shu `providerEventId` ALLAQACHON qayd etilgan
        // bo'lsa (parallel duplicate — bo'lim 52 "10 parallel duplicate
        // webhook"), `create()` unique violation beradi va BUTUN
        // tranzaksiya (yuqoridagi CAS/audit/outbox bilan birga) ROLLBACK
        // bo'ladi — faqat BITTA parallel so'rov haqiqiy mutatsiya qiladi.
        await tx.paymentProviderEvent.create({
          data: {
            id: this.ids.next(),
            paymentId: payment?.id ?? null,
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
        // Duplicate yetkazish — bu ANIQ providerEventId allaqachon to'liq
        // ishlov berilgan (yoki parallel g'olib boshqa tranzaksiya bo'ldi).
        // Idempotent ack — qayta mutatsiya YO'Q.
        return { outcome: 'NOOP_ALREADY_TARGET' };
      }
      throw err;
    }
  }

  private async applyEvent(
    tx: Prisma.TransactionClient,
    payment: Payment | null,
    event: VerifiedPaymentWebhookEvent,
  ): Promise<PaymentEventOutcome> {
    if (!payment) {
      return 'UNKNOWN_PAYMENT';
    }

    // Bo'lim 20/21 — provider yuborgan summa/valyuta Payment snapshot'iga
    // MOS kelishi SHART, aks holda hech qachon SUCCEEDED qilinmaydi.
    if (payment.currency !== event.currency || payment.amount !== event.amountTiyin) {
      await this.audit.record(
        {
          actor: SYSTEM_ACTOR,
          action: 'PAYMENT_WEBHOOK_MISMATCH',
          resourceType: 'PAYMENT',
          resourceId: payment.id,
          contextId: payment.contractId,
          previousState: { amount: payment.amount.toString(), currency: payment.currency },
          newState: { amount: event.amountTiyin.toString(), currency: event.currency },
        },
        tx,
      );
      return 'MISMATCH';
    }

    return this.applyTerminalStatus(tx, payment, event.status, 'WEBHOOK');
  }

  /**
   * Bo'lim 8/9/76 — CAS + ledger funding + audit + outbox: webhook VA
   * Bosqich 9 reconciliation IKKALASI ham shu BITTA metodni chaqiradi
   * (`applyReconciledStatus()` — pastda, public wrapper). Mustaqil
   * "reconcile ledger" matematikasi YOZILMAYDI — financial mutation faqat
   * shu yagona yo'ldan o'tadi.
   */
  private async applyTerminalStatus(
    tx: Prisma.TransactionClient,
    payment: Payment,
    status: VerifiedPaymentWebhookEvent['status'],
    source: 'WEBHOOK' | 'RECONCILIATION',
  ): Promise<PaymentEventOutcome> {
    if (PAYMENT_TERMINAL_STATUSES.includes(payment.status)) {
      if (payment.status === status) return 'NOOP_ALREADY_TARGET';
      return this.recordContradiction(tx, payment, status, source);
    }

    const cas = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ['PENDING', 'PROCESSING'] } },
      data: this.terminalUpdateData(status),
    });
    if (cas.count === 0) {
      // Race: parallel boshqa hodisa (webhook YOKI reconciliation) bizdan
      // oldin terminal holatga o'tkazdi (bo'lim 14 — race har ikki
      // yo'nalishda ham himoyalangan, faqat BITTASI g'olib chiqadi).
      const fresh = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (fresh.status === status) return 'NOOP_ALREADY_TARGET';
      return this.recordContradiction(tx, { ...payment, status: fresh.status }, status, source);
    }

    await this.audit.record(
      {
        actor: SYSTEM_ACTOR,
        action: this.eventAuditAction(status),
        resourceType: 'PAYMENT',
        resourceId: payment.id,
        contextId: payment.contractId,
        previousState: { status: payment.status },
        newState: { status, source },
      },
      tx,
    );
    if (status === 'SUCCEEDED') {
      // Bo'lim 16 — ATOMIK: Payment CAS (yuqorida) + ledger funding + audit
      // + outbox BIR XIL tranzaksiyada. Natija: "Payment SUCCEEDED lekin
      // escrow funded emas" holati STRUKTURAVIY ravishda IMKONSIZ — yo
      // ikkalasi ham COMMIT bo'ladi, yo ikkalasi ham ROLLBACK.
      // `payment.status` bu obyektda hali eski (PENDING/PROCESSING) —
      // `fundPayment()` uni o'qimaydi (faqat amount/currency/id/contractId/
      // payerUserId), shuning uchun to'g'ridan-to'g'ri uzatish xavfsiz.
      const funding = await this.ledger.fundPayment(tx, payment);
      if (funding) {
        await this.audit.record(
          {
            actor: SYSTEM_ACTOR,
            action: 'LEDGER_PAYMENT_FUNDED',
            resourceType: 'LEDGER_TRANSACTION',
            resourceId: funding.id,
            contextId: payment.contractId,
            newState: { paymentId: payment.id, amount: payment.amount.toString(), currency: payment.currency },
          },
          tx,
        );
        await this.outbox.enqueue(
          {
            aggregateType: 'PAYMENT',
            aggregateId: payment.id,
            eventType: 'ESCROW_FUNDED',
            payload: { contractId: payment.contractId, ledgerTransactionId: funding.id },
          },
          tx,
        );
      }
      await this.outbox.enqueue(
        { aggregateType: 'PAYMENT', aggregateId: payment.id, eventType: 'PAYMENT_SUCCEEDED', payload: { contractId: payment.contractId } },
        tx,
      );
    } else if (status === 'FAILED') {
      // Bo'lim 54 — FAILED/CANCELLED/EXPIRED HECH QACHON ledger funding
      // yaratmaydi (faqat authoritative SUCCEEDED source).
      await this.outbox.enqueue(
        { aggregateType: 'PAYMENT', aggregateId: payment.id, eventType: 'PAYMENT_FAILED', payload: { contractId: payment.contractId } },
        tx,
      );
    }
    return 'APPLIED';
  }

  /**
   * Bosqich 9, bo'lim 8/9/12 — reconciliation query natijasi asosida SHU
   * BITTA (webhook bilan bir xil) yo'l orqali qo'llaydi. Mismatch tekshiruvi
   * YO'Q (provider query amount/currency qaytarmaydi — faqat status),
   * qolgan hammasi (terminal-holat himoyasi, CAS, ledger, audit, outbox)
   * ANIQ bir xil. Chaqiruvchi (`ReconciliationService`) natijaga qarab
   * `FinancialAnomaly` yaratish/yaratmaslikni hal qiladi — bu servis faqat
   * "nima bo'ldi"ni qaytaradi (mas'uliyat ajratilgan).
   */
  async applyReconciledStatus(
    tx: Prisma.TransactionClient,
    payment: Payment,
    status: 'SUCCEEDED' | 'FAILED',
  ): Promise<PaymentEventOutcome> {
    return this.applyTerminalStatus(tx, payment, status, 'RECONCILIATION');
  }

  private async recordContradiction(
    tx: Prisma.TransactionClient,
    payment: Payment,
    attemptedStatus: string,
    source: 'WEBHOOK' | 'RECONCILIATION',
  ): Promise<PaymentEventOutcome> {
    // Bo'lim 22/42/43 — "SUCCEEDED -> FAILED" kabi ziddiyatli hodisa HECH
    // QACHON jimgina qayta yozilmaydi (silent overwrite yo'q, terminal
    // monotonicity saqlanadi) — faqat audit'ga qayd etiladi.
    await this.audit.record(
      {
        actor: SYSTEM_ACTOR,
        action: 'PAYMENT_WEBHOOK_CONFLICT',
        resourceType: 'PAYMENT',
        resourceId: payment.id,
        contextId: payment.contractId,
        previousState: { status: payment.status },
        newState: { attemptedStatus, source },
      },
      tx,
    );
    return 'CONFLICT';
  }

  private terminalUpdateData(status: VerifiedPaymentWebhookEvent['status']): Prisma.PaymentUpdateManyMutationInput {
    const now = new Date();
    if (status === 'SUCCEEDED') return { status, succeededAt: now };
    if (status === 'FAILED') return { status, failedAt: now };
    return { status, cancelledAt: now };
  }

  private eventAuditAction(status: VerifiedPaymentWebhookEvent['status']): string {
    if (status === 'SUCCEEDED') return 'PAYMENT_SUCCEEDED';
    if (status === 'FAILED') return 'PAYMENT_FAILED';
    return 'PAYMENT_CANCELLED';
  }
}
