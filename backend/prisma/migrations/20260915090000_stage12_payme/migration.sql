-- Bosqich 12 — Real Payme merchant integration.

-- CreateTable: Payme protokoliga xos transaksiya tarixi. `PaymentStatus`dan
-- ATAYLAB ALOHIDA (schema.prisma izohiga qarang) — pul harakati faqat
-- `PaymentService`ning mavjud authoritative CAS+ledger yo'li orqali.
CREATE TABLE "payme_transactions" (
    "id" UUID NOT NULL,
    "paymeTransactionId" TEXT NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "cancelReason" INTEGER,
    "providerTime" TIMESTAMPTZ(6) NOT NULL,
    "createTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performTime" TIMESTAMPTZ(6),
    "cancelTime" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payme_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: CreateTransaction idempotentligi (bo'lim 12/13).
CREATE UNIQUE INDEX "payme_transactions_paymeTransactionId_key" ON "payme_transactions"("paymeTransactionId");

-- CreateIndex: bitta Payment — umri davomida ko'pi bilan BITTA Payme
-- transaksiyasi (schema.prisma izohiga qarang — har checkout urinishi
-- o'zining YANGI Payment qatorini oladi).
CREATE UNIQUE INDEX "payme_transactions_paymentId_key" ON "payme_transactions"("paymentId");

-- CreateIndex: GetStatement `from<=time<=to` (bo'lim 21).
CREATE INDEX "payme_transactions_createTime_idx" ON "payme_transactions"("createTime");

-- AddForeignKey
ALTER TABLE "payme_transactions" ADD CONSTRAINT "payme_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- `payme_transactions` — insert-on-create keyin faqat WORKER-tomon
-- (bizning o'zimiz) `state`/`cancelReason`/`performTime`/`cancelTime`
-- ustunlarini yangilaydi (Perform/Cancel RPC handler) — bu mutable
-- "provider protocol state" jadvali, APPEND_ONLY_TABLES ro'yxatiga
-- KIRMAYDI (append-only bo'lgan `payment_provider_events`dan farqli —
-- u yerda natija BIR MARTA yozilib qoladi, bu yerda esa Payme bir xil
-- transaksiyani keyinroq Perform/Cancel qilib UPDATE qiladi — bu HAQIQIY,
-- protokol talab qiladigan mutatsiya).
