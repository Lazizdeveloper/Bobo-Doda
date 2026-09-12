import type { PayoutStatus } from '@prisma/client';

export const CREATE_PAYOUT_ENDPOINT = 'POST /seller/payouts';

/** Bo'lim 11/12 (Bosqich 6 bilan bir xil) — crash-recovery uchun. */
export const PAYOUT_CREATE_STALE_AFTER_MS = 30_000;

export const PAYOUT_NON_TERMINAL_STATUSES: readonly PayoutStatus[] = ['PENDING', 'PROCESSING'];

/** Bo'lim 36 — opaque referens uzunlik chegarasi (xom bank/karta ma'lumoti EMAS, faqat matn). */
export const MAX_DESTINATION_REFERENCE_LENGTH = 200;
