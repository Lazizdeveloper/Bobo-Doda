import type { NotificationChannel } from '@prisma/client';

/** Bo'lim 69 — markazlashtirilgan navbat/job nomlari, string'lar kod bo'ylab sochilmasin. */
export const OUTBOX_QUEUE = 'outbox-delivery';
export const OUTBOX_SWEEP_JOB_NAME = 'outbox-sweep';
export const OUTBOX_SWEEP_JOB_ID = 'outbox-sweep-scheduled';

/** Bo'lim 15 — hozir qo'llab-quvvatlanadigan yagona payload versiyasi. */
export const CURRENT_PAYLOAD_VERSION = 1;
export const SUPPORTED_PAYLOAD_VERSIONS: readonly number[] = [1];

/** Bo'lim 18 — hozircha FAQAT SMS haqiqiy implement qilingan (bo'lim 18/61's "real provider yo'q — EMAIL/TELEGRAM ulanmasin" qoidasi). */
export const IMPLEMENTED_CHANNELS: readonly NotificationChannel[] = ['SMS'];

/** Bo'lim 53 — sabab kodlari (strukturaviy, `lastErrorCode`ga yoziladi). */
export const OUTBOX_ERROR_CODES = {
  UNSUPPORTED_EVENT: 'UNSUPPORTED_EVENT',
  UNSUPPORTED_PAYLOAD_VERSION: 'UNSUPPORTED_PAYLOAD_VERSION',
  UNSUPPORTED_CHANNEL: 'UNSUPPORTED_CHANNEL',
  RECIPIENT_MISSING: 'RECIPIENT_MISSING',
  TEMPLATE_DATA_INVALID: 'TEMPLATE_DATA_INVALID',
  PERMANENT_PROVIDER_FAILURE: 'PERMANENT_PROVIDER_FAILURE',
  NO_NOTIFICATION_MAPPED: 'NO_NOTIFICATION_MAPPED',
  MAX_ATTEMPTS_EXHAUSTED: 'MAX_ATTEMPTS_EXHAUSTED',
  HISTORICAL_BACKLOG_CUTOFF: 'HISTORICAL_BACKLOG_CUTOFF',
} as const;
export type OutboxErrorCode = (typeof OUTBOX_ERROR_CODES)[keyof typeof OUTBOX_ERROR_CODES];
