import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, type NotificationChannel, type OutboxEvent, type OutboxStatus } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { AppConfigService } from '@/config/app-config.service';
import { AuditService, type AuditActor } from '@/common/audit/audit.service';
import { DomainError, NotFoundError } from '@/common/errors/domain-error';
import { buildPage, type Page } from '@/common/pagination/page-query.dto';
import { SMS_PROVIDER, type SmsProvider } from '@/infra/sms/sms-provider.interface';
import { RecipientResolverService } from './recipient-resolver.service';
import { EVENT_ROUTES } from './event-routing.constant';
import { CURRENT_PAYLOAD_VERSION, IMPLEMENTED_CHANNELS, OUTBOX_ERROR_CODES } from './notification.constants';

const SYSTEM_ACTOR: AuditActor = { id: null, type: 'SYSTEM', name: 'outbox-worker' };

export type OutboxOutcome = 'DELIVERED' | 'RETRY_SCHEDULED' | 'DEAD' | 'SKIPPED';

export interface ClaimedOutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  payloadVersion: number;
  attempts: number;
}

interface RunBatchStats {
  claimed: number;
  delivered: number;
  retryScheduled: number;
  dead: number;
  skipped: number;
}

/**
 * Bo'lim 7-10/42/43 — Outbox claim/deliver/finalize. Uchta ANIQ bosqich
 * (bo'lim 8): (1) QISQA claim tranzaksiyasi (`FOR UPDATE SKIP LOCKED`),
 * (2) provider chaqiruvi TRANZAKSIYA TASHQARISIDA, (3) YANGI qisqa
 * finalize tranzaksiyasi (claim token CAS bilan — bo'lim 42/43: stale
 * worker yangi worker natijasini QAYTA YOZOLMAYDI).
 */
@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
    private readonly recipients: RecipientResolverService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  // ── 1. Claim (bo'lim 7/38) ──────────────────────────────────────────────

  /** Bitta claim chaqiruvi — BITTA `token` (bo'lim 43), unga tegishli barcha qatorlar. */
  async claimBatch(): Promise<{ token: string; rows: ClaimedOutboxEvent[] }> {
    const { batchSize, processingTimeoutSeconds } = this.config.outbox;
    const token = this.ids.next();
    const rows = await this.prisma.$queryRawUnsafe<ClaimedOutboxEvent[]>(
      `UPDATE outbox_events
       SET status = 'PROCESSING', "processingToken" = $1::uuid, "processingStartedAt" = now(), attempts = attempts + 1
       WHERE id IN (
         SELECT id FROM outbox_events
         WHERE (status = 'PENDING' AND "availableAt" <= now())
            OR (status = 'PROCESSING' AND "processingStartedAt" < now() - ($2::text || ' seconds')::interval)
         ORDER BY "availableAt" ASC, id ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $3
       )
       RETURNING id, "aggregateType", "aggregateId", "eventType", payload, "payloadVersion", attempts`,
      token,
      processingTimeoutSeconds,
      batchSize,
    );
    return { token, rows };
  }

  // ── 2/3. Bir qatorni to'liq qayta ishlash ────────────────────────────────

  async processOne(row: ClaimedOutboxEvent, token: string): Promise<OutboxOutcome> {
    // Bo'lim 52 — noma'lum payload versiyasi: DARHOL DEAD (retry yordam bermaydi).
    if (row.payloadVersion !== CURRENT_PAYLOAD_VERSION) {
      await this.finalize(row.id, token, {
        terminal: 'DEAD',
        lastErrorCode: OUTBOX_ERROR_CODES.UNSUPPORTED_PAYLOAD_VERSION,
        lastError: `payloadVersion=${row.payloadVersion} qo'llab-quvvatlanmaydi`,
      });
      return 'DEAD';
    }

    // Bo'lim 51 — noma'lum eventType: DARHOL DEAD, operator ko'rishi kerak.
    if (!(row.eventType in EVENT_ROUTES)) {
      await this.finalize(row.id, token, {
        terminal: 'DEAD',
        lastErrorCode: OUTBOX_ERROR_CODES.UNSUPPORTED_EVENT,
        lastError: `eventType "${row.eventType}" routing jadvalida yo'q`,
      });
      return 'DEAD';
    }

    // `row.eventType in EVENT_ROUTES` yuqorida tasdiqlangan — kalit MAVJUD,
    // lekin `noUncheckedIndexedAccess` bunga qaramay `| undefined` qo'shadi;
    // shu sababli aniq assertsiya (runtime xavfsiz — key mavjudligi isbotlangan).
    const route = EVENT_ROUTES[row.eventType] as (typeof EVENT_ROUTES)[string];
    if (route === null) {
      // Ongli qaror — bu hodisa turi uchun bildirishnoma MO'LJALLANMAGAN.
      await this.finalize(row.id, token, {
        terminal: 'SKIPPED',
        lastErrorCode: OUTBOX_ERROR_CODES.NO_NOTIFICATION_MAPPED,
        lastError: null,
      });
      return 'SKIPPED';
    }

    if (!IMPLEMENTED_CHANNELS.includes(route.channel)) {
      await this.finalize(row.id, token, {
        terminal: 'DEAD',
        lastErrorCode: OUTBOX_ERROR_CODES.UNSUPPORTED_CHANNEL,
        lastError: `kanal "${route.channel}" hali implement qilinmagan`,
      });
      return 'DEAD';
    }

    const ctx = await this.recipients.resolve(row.aggregateType, row.aggregateId, row.payload);
    if (!ctx) {
      await this.finalize(row.id, token, {
        terminal: 'SKIPPED',
        lastErrorCode: OUTBOX_ERROR_CODES.RECIPIENT_MISSING,
        lastError: `aggregat topilmadi (${row.aggregateType}/${row.aggregateId})`,
      });
      return 'SKIPPED';
    }

    const role = typeof route.recipient === 'function' ? route.recipient(ctx) : route.recipient;
    const userId = role === 'BUYER' ? ctx.buyerId : role === 'SELLER' ? ctx.sellerId : role === 'USER' ? ctx.userId : undefined;
    if (!role || !userId) {
      await this.finalize(row.id, token, {
        terminal: 'SKIPPED',
        lastErrorCode: OUTBOX_ERROR_CODES.RECIPIENT_MISSING,
        lastError: 'qabul qiluvchi rolini aniqlab bo\'lmadi',
      });
      return 'SKIPPED';
    }

    const message = route.render(ctx);
    if (!message) {
      // Bo'lim 22 — shablon uchun kerakli maydon yo'q. Retry FOYDA BERMAYDI
      // (ma'lumot hech qachon paydo bo'lmaydi) — PERMANENT sifatida DEAD.
      await this.finalize(row.id, token, {
        terminal: 'DEAD',
        lastErrorCode: OUTBOX_ERROR_CODES.TEMPLATE_DATA_INVALID,
        lastError: `shablon uchun kerakli maydon yetishmayapti (${row.eventType})`,
      });
      return 'DEAD';
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) {
      await this.finalize(row.id, token, {
        terminal: 'SKIPPED',
        lastErrorCode: OUTBOX_ERROR_CODES.RECIPIENT_MISSING,
        lastError: 'foydalanuvchi telefon raqamiga ega emas',
      });
      return 'SKIPPED';
    }

    // ── Provider chaqiruvi — TRANZAKSIYA TASHQARISIDA (bo'lim 8) ──────────
    const startedAt = new Date();
    let attemptStatus: 'DELIVERED' | 'RETRYABLE_FAILURE' | 'PERMANENT_FAILURE';
    let errorCode: string | undefined;
    let providerMessageId: string | undefined;
    let retryAfterSeconds: number | undefined;
    try {
      const result = await this.sms.send(user.phone, row.eventType, { message }, { reference: row.id });
      if (result.success) {
        attemptStatus = 'DELIVERED';
        providerMessageId = result.providerMessageId;
      } else {
        attemptStatus = result.permanent === true ? 'PERMANENT_FAILURE' : 'RETRYABLE_FAILURE';
        errorCode = result.errorMessage;
        retryAfterSeconds = result.retryAfterSeconds;
      }
    } catch (err) {
      // Bo'lim 3/33 — istisno (masalan tarmoq/timeout) = AMBIGUOUS, HECH
      // QACHON permanent emas: "provider timeout = aniq yuborilmadi degani
      // emas", shuning uchun konservativ ravishda RETRYABLE.
      attemptStatus = 'RETRYABLE_FAILURE';
      errorCode = err instanceof Error ? err.message : String(err);
    }
    const completedAt = new Date();

    await this.finalize(
      row.id,
      token,
      attemptStatus === 'DELIVERED'
        ? { terminal: 'SENT', lastErrorCode: null, lastError: null }
        : attemptStatus === 'PERMANENT_FAILURE'
          ? { terminal: 'DEAD', lastErrorCode: OUTBOX_ERROR_CODES.PERMANENT_PROVIDER_FAILURE, lastError: errorCode ?? null }
          : this.classifyRetry(row.attempts, errorCode, retryAfterSeconds),
      {
        attemptNumber: row.attempts,
        channel: route.channel,
        provider: this.providerName(),
        status: attemptStatus,
        errorCode,
        providerMessageId,
        startedAt,
        completedAt,
      },
    );

    if (attemptStatus === 'DELIVERED') return 'DELIVERED';
    if (attemptStatus === 'PERMANENT_FAILURE') return 'DEAD';
    return row.attempts >= this.config.outbox.maxAttempts ? 'DEAD' : 'RETRY_SCHEDULED';
  }

  private providerName(): string {
    return this.config.sms.provider;
  }

  /** Bo'lim 23/24/25/40 — retryable xato: max attempts tekshiriladi, aks holda backoff (provider Retry-After'i BO'LSA shu USTUVOR, aks holda eksponensial + jitter). */
  private classifyRetry(attempts: number, errorCode: string | undefined, retryAfterSeconds: number | undefined): FinalizeDecision {
    const { maxAttempts } = this.config.outbox;
    if (attempts >= maxAttempts) {
      return { terminal: 'DEAD', lastErrorCode: OUTBOX_ERROR_CODES.MAX_ATTEMPTS_EXHAUSTED, lastError: errorCode ?? null };
    }
    return { terminal: 'PENDING_RETRY', lastErrorCode: null, lastError: errorCode ?? null, retryAfterSeconds };
  }

  /** Bo'lim 40 — provider ANIQ Retry-After bersa, ustuvor (rasmiy semantika); aks holda eksponensial + jitter. */
  private computeBackoffSeconds(attempts: number, retryAfterSeconds: number | undefined): number {
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      return Math.min(retryAfterSeconds, this.config.outbox.retryMaxSeconds);
    }
    const { retryBaseSeconds, retryMaxSeconds } = this.config.outbox;
    const raw = retryBaseSeconds * 2 ** Math.max(0, attempts - 1);
    const capped = Math.min(raw, retryMaxSeconds);
    // Bo'lim 24 — ±15% jitter: "thundering herd" oldini oladi. Testlar
    // ANIQ qiymatga emas, DIAPAZONGA tekshiradi (bo'lim 44 — bu servisga
    // alohida "RandomSource" inject qilishdan ko'ra sodda va yetarli).
    const jitterFactor = 0.85 + Math.random() * 0.3;
    return Math.max(1, Math.round(capped * jitterFactor));
  }

  // ── 3. Finalize (bo'lim 8/41/42/43) ─────────────────────────────────────

  private async finalize(
    outboxEventId: string,
    token: string,
    decision: FinalizeDecision,
    attempt?: {
      attemptNumber: number;
      channel: NotificationChannel;
      provider: string;
      status: 'DELIVERED' | 'RETRYABLE_FAILURE' | 'PERMANENT_FAILURE';
      errorCode: string | undefined;
      providerMessageId: string | undefined;
      startedAt: Date;
      completedAt: Date;
    },
  ): Promise<boolean> {
    const now = new Date();
    const data: Record<string, unknown> = { lastErrorCode: decision.lastErrorCode, lastError: decision.lastError };
    if (decision.terminal === 'PENDING_RETRY') {
      data.status = 'PENDING';
      data.availableAt = new Date(
        now.getTime() + this.computeBackoffSeconds(attempt?.attemptNumber ?? 1, decision.retryAfterSeconds) * 1000,
      );
    } else {
      data.status = decision.terminal;
      data.processedAt = now;
    }

    const applied = await this.prisma.$transaction(async (tx) => {
      // Bo'lim 42/43 — CAS: FAQAT token hali ustunda TURGAN bo'lsa
      // (stale worker eskirgan natija bilan yangi worker holatini
      // QAYTA YOZOLMAYDI — boshqa worker allaqachon reclaim/finalize
      // qilgan bo'lsa `count === 0`).
      const cas = await tx.outboxEvent.updateMany({
        where: { id: outboxEventId, processingToken: token },
        data,
      });
      if (cas.count === 0) return false;

      if (attempt) {
        await tx.outboxDeliveryAttempt.create({
          data: {
            id: this.ids.next(),
            outboxEventId,
            attemptNumber: attempt.attemptNumber,
            channel: attempt.channel,
            provider: attempt.provider,
            status: attempt.status,
            errorCode: attempt.errorCode,
            providerMessageId: attempt.providerMessageId,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
          },
        });
      }

      // Bo'lim 45 — DEAD (DLQ) ma'noli operatsion hodisa: audit yoziladi.
      // Muvaffaqiyatli SENT/SKIPPED uchun YOZILMAYDI (bo'lim 45 — "har
      // muvaffaqiyatli SMS uchun AuditLog shart emas, excessive noise").
      if (decision.terminal === 'DEAD') {
        await this.audit.record(
          {
            actor: SYSTEM_ACTOR,
            action: 'OUTBOX_EVENT_DEAD',
            resourceType: 'OUTBOX_EVENT',
            resourceId: outboxEventId,
            newState: { lastErrorCode: decision.lastErrorCode },
          },
          tx,
        );
      }
      return true;
    });

    if (!applied) {
      this.logger.warn(
        { outboxEventId, token },
        'Outbox finalize: claim token endi mos emas (stale worker) — natija tashlab yuborildi',
      );
    }
    return applied;
  }

  // ── Batch orchestration (bo'lim 39 — bounded concurrency) ───────────────

  async runBatch(): Promise<RunBatchStats> {
    const { token, rows } = await this.claimBatch();
    const stats: RunBatchStats = { claimed: rows.length, delivered: 0, retryScheduled: 0, dead: 0, skipped: 0 };
    if (rows.length === 0) return stats;

    const concurrency = Math.min(this.config.outbox.workerConcurrency, rows.length);
    await mapWithConcurrency(rows, concurrency, async (row) => {
      try {
        const outcome = await this.processOne(row, token);
        if (outcome === 'DELIVERED') stats.delivered += 1;
        else if (outcome === 'RETRY_SCHEDULED') stats.retryScheduled += 1;
        else if (outcome === 'DEAD') stats.dead += 1;
        else stats.skipped += 1;
      } catch (err) {
        this.logger.error({ outboxEventId: row.id, err }, 'Outbox: kutilmagan xato — qator qayta claim qilinguncha PROCESSING qoladi (lease keyin tugaydi)');
      }
    });
    return stats;
  }

  // ── Staff operatsiyalari (bo'lim 27/28/29) ──────────────────────────────

  async getByIdOrThrow(id: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id },
      include: { deliveryAttempts: { orderBy: { attemptNumber: 'asc' } } },
    });
    if (!event) throw new NotFoundError('Outbox hodisasi topilmadi', 'NOT_FOUND');
    return event;
  }

  async listForStaff(
    filters: { status?: OutboxStatus; eventType?: string; aggregateType?: string },
    page: number,
    perPage: number,
  ): Promise<Page<OutboxEvent>> {
    const where: Prisma.OutboxEventWhereInput = {
      status: filters.status,
      eventType: filters.eventType,
      aggregateType: filters.aggregateType,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.outboxEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.outboxEvent.count({ where }),
    ]);
    return buildPage(items, total, page, perPage);
  }

  async summary(): Promise<{
    pending: number;
    processing: number;
    dead: number;
    skipped: number;
    oldestPendingAgeSeconds: number | null;
  }> {
    const [pending, processing, dead, skipped, oldestPending] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
      this.prisma.outboxEvent.count({ where: { status: 'PROCESSING' } }),
      this.prisma.outboxEvent.count({ where: { status: 'DEAD' } }),
      this.prisma.outboxEvent.count({ where: { status: 'SKIPPED' } }),
      this.prisma.outboxEvent.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ]);
    return {
      pending,
      processing,
      dead,
      skipped,
      oldestPendingAgeSeconds: oldestPending ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000) : null,
    };
  }

  /**
   * Bo'lim 28/29 — FAQAT DEAD/SKIPPED holatidan `PENDING`ga qaytaradi
   * (`availableAt=now`). Payload/business event QAYTA YARATILMAYDI,
   * status'ni "SUCCEEDED" deb QO'LDA belgilash IMKONSIZ (bo'lim 29) —
   * keyingi haqiqiy claim/deliver siklidan o'tadi, xolos.
   */
  async retry(id: string, actor: AuditActor): Promise<OutboxEvent> {
    const existing = await this.prisma.outboxEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Outbox hodisasi topilmadi', 'NOT_FOUND');
    if (existing.status !== 'DEAD' && existing.status !== 'SKIPPED') {
      throw new DomainError('INVALID_TRANSITION', 'Faqat DEAD yoki SKIPPED hodisani qayta rejalashtirish mumkin');
    }
    const updated = await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PENDING', availableAt: new Date(), processedAt: null },
    });
    await this.audit.record({
      actor,
      action: 'OUTBOX_MANUAL_RETRY_REQUESTED',
      resourceType: 'OUTBOX_EVENT',
      resourceId: id,
      previousState: { status: existing.status },
      newState: { status: 'PENDING' },
    });
    return updated;
  }
}

interface FinalizeDecision {
  terminal: 'SENT' | 'DEAD' | 'SKIPPED' | 'PENDING_RETRY';
  lastErrorCode: string | null;
  lastError: string | null;
  /** Bo'lim 40 — provider'ning ANIQ Retry-After signali (bo'lsa, eksponensial formuladan USTUVOR). */
  retryAfterSeconds?: number;
}

/** Oddiy chegaralangan-parallellik yordamchisi — yangi bog'liqlik qo'shilmadi (bo'lim 39). */
async function mapWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      if (current !== undefined) await fn(current);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
}
