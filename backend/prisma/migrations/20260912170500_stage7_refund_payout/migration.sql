-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "requestedByStaffId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMPTZ(6),
    "succeededAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_provider_events" (
    "id" UUID NOT NULL,
    "refundId" UUID,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "destinationReference" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerPayoutId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMPTZ(6),
    "succeededAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_provider_events" (
    "id" UUID NOT NULL,
    "payoutId" UUID,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refunds_contractId_createdAt_idx" ON "refunds"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE INDEX "refunds_status_createdAt_idx" ON "refunds"("status", "createdAt");

-- CreateIndex
CREATE INDEX "refunds_provider_providerRefundId_idx" ON "refunds"("provider", "providerRefundId");

-- CreateIndex
CREATE INDEX "refund_provider_events_refundId_receivedAt_idx" ON "refund_provider_events"("refundId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "refund_provider_events_provider_providerEventId_key" ON "refund_provider_events"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "payouts_sellerId_createdAt_idx" ON "payouts"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "payouts_status_createdAt_idx" ON "payouts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payouts_provider_providerPayoutId_idx" ON "payouts"("provider", "providerPayoutId");

-- CreateIndex
CREATE INDEX "payout_provider_events_payoutId_receivedAt_idx" ON "payout_provider_events"("payoutId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payout_provider_events_provider_providerEventId_key" ON "payout_provider_events"("provider", "providerEventId");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_provider_events" ADD CONSTRAINT "refund_provider_events_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_provider_events" ADD CONSTRAINT "payout_provider_events_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (1): DB CHECK constraint'lar — bo'lim 57 (Payment
-- migratsiyasi bilan bir xil naqsh, oxirgi chiziq sifatida).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_amount_positive" CHECK ("amount" > 0);

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (2): partial unique index — bo'lim 15/45'dagi ENG
-- MUHIM refund invarianti (Payment migratsiyasidagi `payments_contract_
-- succeeded_uidx` bilan bir xil falsafa). Prisma DSL partial index'ni
-- ifodalay olmaydi.
--
-- "Bitta Payment uchun bir vaqtda faqat BITTA amaldagi (hali muvaffaqiyatsiz
-- bo'lmagan) refund bo'lishi mumkin": ikkita xodim parallel ravishda bitta
-- to'lov uchun ikkita Refund yaratishga urinsa (yoki bitta xodim ikki marta
-- bosса), ikkinchisi shu yerda DB darajasida rad etiladi — ilova
-- darajasidagi oldindan tekshiruv (`RefundService.create()`) FAQAT tezkor
-- xato xabari uchun, haqiqiy himoya shu.
-- ─────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "refunds_payment_active_uidx" ON "refunds"("paymentId") WHERE "status" IN ('PENDING', 'PROCESSING', 'SUCCEEDED');

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (3): REFUND_CLEARING platforma hisobini EAGER bootstrap
-- qilish — Bosqich 6'dagi PAYMENT_CLEARING/PLATFORM_REVENUE bilan BIR XIL
-- qaror (docs B8): runtime'da HECH QANDAY create-race yo'q, faqat SELECT.
-- Bo'lim 73 — bu INSERT oldingi (`stage7_ledger_enum_values`) migratsiyada
-- ALLAQACHON commit bo'lgan `REFUND_CLEARING` qiymatiga tayanadi (o'sha
-- migratsiya ALOHIDA, chunki Postgres yangi qo'shilgan enum qiymatini
-- QO'SHILGAN TRANZAKSIYaNING O'ZIDA ishlatishga yo'l qo'ymaydi).
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO "ledger_accounts" ("id", "type", "ownerType", "ownerId", "currency", "createdAt") VALUES
  ('00000000-0000-7000-8000-000000000003', 'REFUND_CLEARING', 'PLATFORM', NULL, 'UZS', CURRENT_TIMESTAMP);

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (4): A4/T1 append-only REVOKE — `src/common/db/
-- append-only.constants.ts` bilan BIR XIL ro'yxat. `refund_provider_events`/
-- `payout_provider_events` — `payment_provider_events` bilan bir xil
-- insert-once dedup jurnali.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  app_role text := COALESCE(NULLIF(current_setting('bobododa.app_role', true), ''), 'bobododa_app');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'refund_provider_events', app_role);
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'payout_provider_events', app_role);
  END IF;
END
$$;
