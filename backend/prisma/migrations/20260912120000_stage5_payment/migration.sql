-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "payerUserId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "providerCreatedAt" TIMESTAMPTZ(6),
    "succeededAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_events" (
    "id" UUID NOT NULL,
    "paymentId" UUID,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_contractId_createdAt_idx" ON "payments"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_payerUserId_createdAt_idx" ON "payments"("payerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_provider_providerPaymentId_idx" ON "payments"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "payment_provider_events_paymentId_receivedAt_idx" ON "payment_provider_events"("paymentId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_events_provider_providerEventId_key" ON "payment_provider_events"("provider", "providerEventId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_events" ADD CONSTRAINT "payment_provider_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (1): DB CHECK constraint — bo'lim 35. Ilova
-- validatsiyasiga qo'shimcha, oxirgi chiziq sifatida.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (2): partial unique index'lar — bo'lim 5/35/59'dagi ENG
-- MUHIM moliyaviy invariant. Prisma DSL partial index'ni ifodalay olmaydi
-- (`@@unique` har doim BUTUN jadvalga tegishli), shuning uchun raw SQL.
--
-- "Bitta Contract ikki marta muvaffaqiyatli to'lanib ketmasin": bir nechta
-- `Payment` qatori (har urinish — YANGI qator, bo'lim 5 qarori) bo'lishi
-- mumkin, lekin ular orasida FAQAT BITTASI `SUCCEEDED` bo'la oladi — buni
-- ilova darajasidagi `if` emas, shu partial unique index DB darajasida
-- majburlaydi (parallel ikkita webhook bir vaqtda ikkita Payment qatorini
-- SUCCEEDED qilishga urinsa, ikkinchisi shu yerda yiqiladi).
-- ─────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "payments_contract_succeeded_uidx" ON "payments"("contractId") WHERE "status" = 'SUCCEEDED';

-- Ikkinchi invariant: bitta provider referensi ikkita Payment qatoriga
-- bog'lanib qolmasin (masalan xatolik bilan ikki marta yozilsa).
-- `providerPaymentId` NULL bo'lishi mumkin (ambiguous urinish) — shuning
-- uchun partial (faqat NULL bo'lmaganlar uchun).
CREATE UNIQUE INDEX "payments_provider_reference_uidx" ON "payments"("provider", "providerPaymentId") WHERE "providerPaymentId" IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (3): A4/T1 append-only REVOKE — `src/common/db/
-- append-only.constants.ts` bilan BIR XIL ro'yxat (Bosqich 1 init
-- migratsiyasidagi naqshning davomi). `payment_provider_events` — webhook
-- qabul qilish/dedup jurnali, insert-once (bo'lim 18/54): natija allaqachon
-- BITTA `create()` chaqiruvida hisoblab yozilgan bo'ladi, keyin hech qachon
-- UPDATE/DELETE qilinmaydi.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  app_role text := COALESCE(NULLIF(current_setting('bobododa.app_role', true), ''), 'bobododa_app');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'payment_provider_events', app_role);
  END IF;
END
$$;
