-- Bosqich 9 — Financial Reconciliation + Operational Hardening.
-- Uchta YANGI enum (mavjud enum kengaytirilmayapti — shuning uchun Phase
-- 7/8'dagi "enum-qiymat va foydalanishni ALOHIDA migratsiyaga bo'lish"
-- ehtiyoji bu yerda YO'Q, bittasi yetarli).

-- CreateEnum
CREATE TYPE "ReconciliationTrigger" AS ENUM ('AUTOMATIC', 'STAFF', 'DEPLOYMENT_CHECK');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('NO_CHANGE', 'RECONCILED', 'ANOMALY', 'ERROR');

-- CreateEnum
CREATE TYPE "FinancialAnomalySeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "reconciliation_runs" (
    "id" UUID NOT NULL,
    "operationType" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "trigger" "ReconciliationTrigger" NOT NULL,
    "status" "ReconciliationRunStatus" NOT NULL,
    "observedLocalStatus" TEXT NOT NULL,
    "observedProviderStatus" TEXT,
    "actionTaken" TEXT,
    "errorCode" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "completedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_anomalies" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "FinancialAnomalySeverity" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(6),
    "resolvedByStaffId" UUID,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_runs_operationType_operationId_createdAt_idx" ON "reconciliation_runs"("operationType", "operationId", "createdAt");

-- CreateIndex
CREATE INDEX "reconciliation_runs_status_createdAt_idx" ON "reconciliation_runs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "financial_anomalies_severity_detectedAt_idx" ON "financial_anomalies"("severity", "detectedAt");

-- CreateIndex
CREATE INDEX "financial_anomalies_entityType_entityId_idx" ON "financial_anomalies"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_anomalies_code_entityType_entityId_key" ON "financial_anomalies"("code", "entityType", "entityId");

-- CreateIndex — bo'lim 15/17/57: stuck-scan `WHERE status IN (...) ORDER BY
-- "updatedAt" ASC, id ASC` uchun (mavjud `(status, createdAt)` indeks bu
-- so'rovga mos emas).
CREATE INDEX "payments_status_updatedAt_idx" ON "payments"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "refunds_status_updatedAt_idx" ON "refunds"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "payouts_status_updatedAt_idx" ON "payouts"("status", "updatedAt");

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan — A4/T1 append-only REVOKE (`src/common/db/
-- append-only.constants.ts` bilan BIR XIL ro'yxat, Phase 7/8 migratsiyalari
-- bilan bir xil naqsh). `reconciliation_runs` — insert-on-complete (bo'lim
-- 59/60): qator FAQAT natija to'liq ma'lum bo'lganda BIR MARTA yoziladi,
-- create-keyin-update tsikli YO'Q. `financial_anomalies` ATAYLAB BU YERGA
-- QO'SHILMAYDI — u mutable (staff `acknowledge()` orqali resolvedAt/
-- resolvedByStaffId/resolutionNote yozadi).
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  app_role text := COALESCE(NULLIF(current_setting('bobododa.app_role', true), ''), 'bobododa_app');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'reconciliation_runs', app_role);
  END IF;
END
$$;
