import type { RefundStatus } from '@prisma/client';

export const CREATE_REFUND_ENDPOINT = 'POST /staff/refunds';

/** Bo'lim 11/12 (Bosqich 6 bilan bir xil) — crash-recovery uchun. */
export const REFUND_CREATE_STALE_AFTER_MS = 30_000;

export const REFUND_NON_TERMINAL_STATUSES: readonly RefundStatus[] = ['PENDING', 'PROCESSING'];
