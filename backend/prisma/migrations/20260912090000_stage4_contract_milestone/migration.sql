-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING_SELLER', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED');

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "serviceTitleSnapshot" TEXT NOT NULL,
    "serviceDescriptionSnapshot" TEXT NOT NULL,
    "categoryNameSnapshot" TEXT NOT NULL,
    "sellerDisplayNameSnapshot" TEXT NOT NULL,
    "agreedAmount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "platformFeeRateBpsSnapshot" INTEGER NOT NULL,
    "platformFeeAmountSnapshot" BIGINT NOT NULL,
    "deadline" TIMESTAMPTZ(6) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING_SELLER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMPTZ(6),
    "submittedAt" TIMESTAMPTZ(6),
    "approvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_submissions" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "message" TEXT,
    "deliverableUrls" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_revision_requests" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_revision_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_buyerId_status_createdAt_idx" ON "contracts"("buyerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "contracts_sellerId_status_createdAt_idx" ON "contracts"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "contracts_serviceId_idx" ON "contracts"("serviceId");

-- CreateIndex
CREATE INDEX "milestones_contractId_status_idx" ON "milestones"("contractId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_contractId_position_key" ON "milestones"("contractId", "position");

-- CreateIndex
CREATE INDEX "milestone_submissions_milestoneId_createdAt_idx" ON "milestone_submissions"("milestoneId", "createdAt");

-- CreateIndex
CREATE INDEX "milestone_revision_requests_milestoneId_createdAt_idx" ON "milestone_revision_requests"("milestoneId", "createdAt");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_submissions" ADD CONSTRAINT "milestone_submissions_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_revision_requests" ADD CONSTRAINT "milestone_revision_requests_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (1): DB CHECK constraint'lar — bo'lim 31. Ilova
-- validatsiyasiga qo'shimcha, oxirgi chiziq sifatida.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_buyer_seller_distinct" CHECK ("buyerId" != "sellerId");
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_agreed_amount_positive" CHECK ("agreedAmount" > 0);
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_amount_positive" CHECK ("amount" > 0);

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (2): A4/T1 append-only REVOKE — `src/common/db/
-- append-only.constants.ts` bilan BIR XIL ro'yxat (Bosqich 1 init
-- migratsiyasidagi naqshning aynan davomi — `milestone_submissions`/
-- `milestone_revision_requests` ish tarixi, `AuditLog` bilan bir xil
-- append-only siyosat: yozib bo'lgach hech qachon UPDATE/DELETE emas).
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  app_role text := COALESCE(NULLIF(current_setting('bobododa.app_role', true), ''), 'bobododa_app');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'milestone_submissions', app_role);
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'milestone_revision_requests', app_role);
  END IF;
END
$$;
