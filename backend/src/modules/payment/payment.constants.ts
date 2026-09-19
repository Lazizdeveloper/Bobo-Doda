import type { PaymentStatus } from '@prisma/client';

export const CREATE_PAYMENT_ENDPOINT = 'POST /me/contracts/:contractId/payment';

/**
 * Bo'lim 12 — crash recovery. Real provider chaqiruvi o'zining explicit
 * timeout'iga ega bo'lishi kerak (bo'lim 28) — bu son undan SEZILARLI katta
 * bo'lishi shart, aks holda hali tirik so'rovni "tashlab ketilgan" deb xato
 * hisoblab qo'yamiz. 30s — HTTP darajasidagi har qanday oqilona provider
 * timeout'idan (odatda 5-15s) ancha keng zaxira bilan.
 */
export const PAYMENT_CREATE_STALE_AFTER_MS = 30_000;

export const PAYMENT_TERMINAL_STATUSES: readonly PaymentStatus[] = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'];
