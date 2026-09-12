import type { DisputeStatus } from '@prisma/client';

export const OPEN_DISPUTE_ENDPOINT = 'POST /me/contracts/:contractId/disputes';
export const RESOLVE_DISPUTE_ENDPOINT = 'POST /staff/disputes/:id/resolve';

/** Bo'lim 34 — resolve() moliyaviy operatsiya, boshqa staff-financial endpointlar bilan bir xil crash-recovery oynasi. */
export const RESOLVE_DISPUTE_STALE_AFTER_MS = 30_000;

/** Bo'lim 9/11 — post-settlement ochilishi DARHOL ledger hold yaratishi mumkin, shuning uchun HAM idempotent. */
export const OPEN_DISPUTE_STALE_AFTER_MS = 30_000;

/** Bo'lim 7/54 — bitta Contract uchun bir vaqtda faqat BITTA "ochiq" dispute (DB partial unique index bilan bir xil ro'yxat). */
export const DISPUTE_OPEN_STATUSES: readonly DisputeStatus[] = ['OPEN', 'UNDER_REVIEW'];

/** Bo'lim 37 — user faqat OPEN'dan (hali staff qo'l urmagan) o'zi qaytarib olishi mumkin. */
export const DISPUTE_USER_CANCELLABLE_STATUSES: readonly DisputeStatus[] = ['OPEN'];

/** `DisputeEvidence.type` — Prisma enum emas (schema.prisma izohiga qarang), ilova darajasidagi yopiq to'plam. */
export const DISPUTE_EVIDENCE_TYPES = ['TEXT', 'FILE'] as const;
export type DisputeEvidenceTypeValue = (typeof DISPUTE_EVIDENCE_TYPES)[number];

/** `fileReference` uzunlik chegarasi — opaque referens (S3 hali yo'q), xom bayt EMAS. */
export const MAX_EVIDENCE_TEXT_LENGTH = 2000;
export const MAX_EVIDENCE_FILE_REFERENCE_LENGTH = 500;
