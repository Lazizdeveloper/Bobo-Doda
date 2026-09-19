import type { PaymentStatus, PayoutStatus, ReconciliationTrigger, RefundStatus } from '@prisma/client';

/** Bo'lim 16 — BullMQ navbat nomi. Phase 10 outbox worker bilan ARALASHTIRILMAYDI (alohida navbat). */
export const RECONCILIATION_QUEUE = 'reconciliation';
/** Rejalashtirilgan (repeatable) batch-scan job'ining BARQAROR nomi/ID'i — bo'lim 52: replica'lar orasida duplicate schedule oldini oladi (BullMQ o'zi repeat+jobId bo'yicha dedup qiladi). */
export const RECONCILIATION_BATCH_JOB_NAME = 'reconciliation-batch';
export const RECONCILIATION_BATCH_JOB_ID = 'reconciliation-batch-scheduled';

/** Bo'lim 8/9/12/13 — reconciliation FAQAT shu ikkita local aggregate holatda amal qiladi. */
export const PAYMENT_RECONCILE_ELIGIBLE_STATUSES: readonly PaymentStatus[] = ['PENDING', 'PROCESSING'];
export const REFUND_RECONCILE_ELIGIBLE_STATUSES: readonly RefundStatus[] = ['PENDING', 'PROCESSING'];
export const PAYOUT_RECONCILE_ELIGIBLE_STATUSES: readonly PayoutStatus[] = ['PENDING', 'PROCESSING'];

export const RECONCILIATION_TRIGGERS: readonly ReconciliationTrigger[] = ['AUTOMATIC', 'STAFF', 'DEPLOYMENT_CHECK'];

export type OperationType = 'PAYMENT' | 'REFUND' | 'PAYOUT';
