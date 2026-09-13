-- Bosqich 10 — Outbox worker + notification delivery + retry/DLQ.
--
-- Enum qiymati qo'shish (Phase 7/8'dagi saboq — bo'lim 73/68): PostgreSQL
-- yangi qo'shilgan enum qiymatini SHU TRANZAKSIYA commit bo'lgunicha
-- ISHLATISHGA yo'l qo'ymaydi. Bu migratsiyaning qolgan qismi (append-only
-- REVOKE/GRANT, yangi ustun/jadval) HECH QANDAY DML orqali 'DEAD'/'SKIPPED'
-- qiymatlaridan foydalanmaydi — shuning uchun ALOHIDA migratsiyaga
-- BO'LISH SHART EMAS (Bosqich 7/8'dagi kabi split faqat "keyingi
-- migratsiya yangi qiymatdan DML'da foydalansa" kerak edi).
ALTER TYPE "OutboxStatus" ADD VALUE 'DEAD';
ALTER TYPE "OutboxStatus" ADD VALUE 'SKIPPED';

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "OutboxDeliveryAttemptStatus" AS ENUM ('DELIVERED', 'RETRYABLE_FAILURE', 'PERMANENT_FAILURE');

-- AlterTable
ALTER TABLE "outbox_events"
  ADD COLUMN "payloadVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "processingToken" UUID,
  ADD COLUMN "processingStartedAt" TIMESTAMPTZ(6);

-- CreateIndex — bo'lim 9/10: PROCESSING'da "qotib qolgan" qatorlarni topish uchun.
CREATE INDEX "outbox_events_status_processingStartedAt_idx" ON "outbox_events"("status", "processingStartedAt");

-- CreateTable
CREATE TABLE "outbox_delivery_attempts" (
    "id" UUID NOT NULL,
    "outboxEventId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "OutboxDeliveryAttemptStatus" NOT NULL,
    "errorCode" TEXT,
    "providerMessageId" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "completedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_delivery_attempts_outboxEventId_attemptNumber_idx" ON "outbox_delivery_attempts"("outboxEventId", "attemptNumber");

-- CreateIndex
CREATE INDEX "outbox_delivery_attempts_outboxEventId_createdAt_idx" ON "outbox_delivery_attempts"("outboxEventId", "createdAt");

-- AddForeignKey
ALTER TABLE "outbox_delivery_attempts" ADD CONSTRAINT "outbox_delivery_attempts_outboxEventId_fkey"
  FOREIGN KEY ("outboxEventId") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (1): `outbox_events` uchun QO'SHIMCHA column-level
-- GRANT — init migratsiyada allaqachon table-wide REVOKE qilingan
-- ("status","attempts","lastError","availableAt","processedAt" ustunlariga
-- qaytarib GRANT berilgan edi). Bu YANGI uchta ustunga HAM xuddi shunday
-- worker UPDATE qila olishi kerak (claim/finalize) — `src/common/db/
-- append-only.constants.ts`dagi `allowUpdateColumns` bilan BIR XIL ro'yxat.
-- `payloadVersion` ATAYLAB BU YERDA YO'Q — faqat yaratilishda yoziladi.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  app_role text := COALESCE(NULLIF(current_setting('bobododa.app_role', true), ''), 'bobododa_app');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format(
      'GRANT UPDATE ("lastErrorCode", "processingToken", "processingStartedAt") ON %I TO %I',
      'outbox_events', app_role
    );

    -- Qo'lda qo'shilgan (2): `outbox_delivery_attempts` — TO'LIQ append-only
    -- (Bosqich 9'dagi `reconciliation_runs` bilan bir xil naqsh, bo'lim 6).
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'outbox_delivery_attempts', app_role);
  END IF;
END
$$;
