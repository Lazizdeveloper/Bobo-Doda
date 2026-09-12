-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('SCOPE', 'QUALITY', 'DEADLINE', 'PAYMENT', 'COMMUNICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeResolutionType" AS ENUM ('BUYER_FULL_REFUND', 'SELLER_FULL_RELEASE', 'SPLIT');

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "disputeId" UUID;

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "openedByUserId" UUID NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "preSettlement" BOOLEAN NOT NULL,
    "disputedAmount" BIGINT NOT NULL,
    "heldAmount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "resolutionType" "DisputeResolutionType",
    "buyerAwardAmount" BIGINT,
    "sellerAwardAmount" BIGINT,
    "resolutionReason" TEXT,
    "openedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStartedAt" TIMESTAMPTZ(6),
    "resolvedAt" TIMESTAMPTZ(6),
    "resolvedByStaffId" UUID,
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectedByStaffId" UUID,
    "cancelledAt" TIMESTAMPTZ(6),
    "appealable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" UUID NOT NULL,
    "disputeId" UUID NOT NULL,
    "submittedByUserId" UUID,
    "submittedByStaffId" UUID,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "fileReference" TEXT,
    "milestoneId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_events" (
    "id" UUID NOT NULL,
    "disputeId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disputes_contractId_createdAt_idx" ON "disputes"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "disputes_status_createdAt_idx" ON "disputes"("status", "createdAt");

-- CreateIndex
CREATE INDEX "disputes_openedByUserId_idx" ON "disputes"("openedByUserId");

-- CreateIndex
CREATE INDEX "dispute_evidence_disputeId_createdAt_idx" ON "dispute_evidence"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "dispute_events_disputeId_createdAt_idx" ON "dispute_events"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "refunds_disputeId_idx" ON "refunds"("disputeId");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (1): DB CHECK constraint'lar — bo'lim 62/64. Ilova
-- validatsiyasiga qo'shimcha, oxirgi chiziq sifatida.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_amounts_nonnegative" CHECK (
  "disputedAmount" >= 0
  AND "heldAmount" >= 0
  AND "heldAmount" <= "disputedAmount"
  AND ("buyerAwardAmount" IS NULL OR "buyerAwardAmount" >= 0)
  AND ("sellerAwardAmount" IS NULL OR "sellerAwardAmount" >= 0)
);

-- Bo'lim 63 — holat-bog'liq maydon izchilligi: RESOLVED bo'lsa resolution
-- maydonlari VA award yig'indisi heldAmount'ga TENG bo'lishi SHART;
-- REJECTED/CANCELLED bo'lsa mos vaqt/actor maydoni to'ldirilgan bo'lishi shart.
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_status_fields_consistency" CHECK (
  (
    "status" <> 'RESOLVED'
    OR (
      "resolvedAt" IS NOT NULL
      AND "resolvedByStaffId" IS NOT NULL
      AND "resolutionType" IS NOT NULL
      AND "buyerAwardAmount" IS NOT NULL
      AND "sellerAwardAmount" IS NOT NULL
      AND "buyerAwardAmount" + "sellerAwardAmount" = "heldAmount"
    )
  )
  AND ("status" <> 'REJECTED' OR ("rejectedAt" IS NOT NULL AND "rejectedByStaffId" IS NOT NULL))
  AND ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (2): partial unique index — bo'lim 7/54'dagi ENG MUHIM
-- dispute invarianti (Refund/Payment migratsiyalaridagi partial unique
-- index'lar bilan bir xil falsafa). Prisma DSL partial index'ni ifodalay
-- olmaydi.
--
-- "Bitta Contract uchun bir vaqtda faqat BITTA ochiq (OPEN/UNDER_REVIEW)
-- Dispute": ikkita ishtirokchi (yoki bitta ishtirokchi ikki marta) parallel
-- ravishda dispute ochishga urinsa, ikkinchisi shu yerda DB darajasida rad
-- etiladi — ilova darajasidagi oldindan tekshiruv (`DisputeService.open()`)
-- FAQAT tezkor xato xabari uchun, haqiqiy himoya shu.
-- ─────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "disputes_contract_active_uidx" ON "disputes"("contractId") WHERE "status" IN ('OPEN', 'UNDER_REVIEW');

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (3): A4/T1 append-only REVOKE — `src/common/db/
-- append-only.constants.ts` bilan BIR XIL ro'yxat. `dispute_evidence`/
-- `dispute_events` — dalil/tarix jurnali (bo'lim 16/51): typo tuzatish
-- uchun YANGI yozuv qo'shiladi, eskisi UPDATE/DELETE qilinmaydi.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  app_role text := COALESCE(NULLIF(current_setting('bobododa.app_role', true), ''), 'bobododa_app');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'dispute_evidence', app_role);
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'dispute_events', app_role);
  END IF;
END
$$;
