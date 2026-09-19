-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('PAYMENT_CLEARING', 'ESCROW', 'SELLER_PAYABLE', 'PLATFORM_REVENUE');

-- CreateEnum
CREATE TYPE "LedgerAccountOwnerType" AS ENUM ('PLATFORM', 'USER');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('PAYMENT_FUNDING', 'CONTRACT_SETTLEMENT');

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "ownerType" "LedgerAccountOwnerType" NOT NULL,
    "ownerId" UUID,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL,
    "type" "LedgerTransactionType" NOT NULL,
    "currency" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ledger_accounts_ownerType_ownerId_idx" ON "ledger_accounts"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_type_ownerType_ownerId_currency_key" ON "ledger_accounts"("type", "ownerType", "ownerId", "currency");

-- CreateIndex
CREATE INDEX "ledger_transactions_createdAt_idx" ON "ledger_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_type_sourceId_key" ON "ledger_transactions"("type", "sourceId");

-- CreateIndex
CREATE INDEX "ledger_entries_transactionId_idx" ON "ledger_entries"("transactionId");

-- CreateIndex
CREATE INDEX "ledger_entries_accountId_createdAt_idx" ON "ledger_entries"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (1): CHECK — bo'lim 7/58: nolinchi yozuv umuman
-- yaratilmaydi (ilova darajasida `assertBalanced()` allaqachon rad etadi,
-- bu oxirgi chiziq).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_amount_nonzero" CHECK ("amount" <> 0);

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (2): platforma hisoblari uchun PARTIAL unique index —
-- bo'lim 5/42. Prisma'ning umumiy `@@unique([type, ownerType, ownerId,
-- currency])` indeksi `ownerId = NULL` bo'lganda ISHLAMAYDI (Postgres
-- qoidasi: NULL != NULL unique tekshiruvida), shuning uchun platforma
-- hisoblari (`ownerId` doim NULL) uchun ALOHIDA himoya kerak.
-- ─────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "ledger_accounts_platform_uidx" ON "ledger_accounts"("type", "currency") WHERE "ownerType" = 'PLATFORM';

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (3): platforma hisoblarini EAGER bootstrap qilish —
-- docs B8: "Eager (platforma hisoblari) ... bitta marta, bootstrap
-- migratsiyasida (har doim mavjud)". Bu runtime'da `PAYMENT_CLEARING`/
-- `PLATFORM_REVENUE` uchun HECH QANDAY create-race yo'qligini kafolatlaydi
-- (`LedgerService.getPlatformAccount()` faqat SELECT qiladi).
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO "ledger_accounts" ("id", "type", "ownerType", "ownerId", "currency", "createdAt") VALUES
  ('00000000-0000-7000-8000-000000000001', 'PAYMENT_CLEARING', 'PLATFORM', NULL, 'UZS', CURRENT_TIMESTAMP),
  ('00000000-0000-7000-8000-000000000002', 'PLATFORM_REVENUE', 'PLATFORM', NULL, 'UZS', CURRENT_TIMESTAMP);

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (4): valyuta muvofiqligi trigger — bo'lim 46: bitta
-- entry'ning valyutasi HAM o'z tranzaksiyasi, HAM o'z hisobi bilan mos
-- bo'lishi SHART (masalan UZS escrow → USD seller account HECH QACHON
-- yaratilmasin). CHECK constraint bu yerda ishlamaydi (boshqa jadvalga
-- qarash kerak) — shuning uchun BEFORE INSERT trigger.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_ledger_entry_currency() RETURNS TRIGGER AS $$
DECLARE
  tx_currency TEXT;
  acct_currency TEXT;
BEGIN
  SELECT currency INTO tx_currency FROM ledger_transactions WHERE id = NEW."transactionId";
  SELECT currency INTO acct_currency FROM ledger_accounts WHERE id = NEW."accountId";
  IF NEW.currency IS DISTINCT FROM tx_currency OR NEW.currency IS DISTINCT FROM acct_currency THEN
    RAISE EXCEPTION 'ledger_entries: valyuta mos emas (entry=%, transaction=%, account=%)', NEW.currency, tx_currency, acct_currency;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_currency_check
BEFORE INSERT ON "ledger_entries"
FOR EACH ROW
EXECUTE FUNCTION check_ledger_entry_currency();

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (5): DB darajasidagi balans invarianti — bo'lim 2/21,
-- ENG MUHIM moliyaviy tekshiruv. `DEFERRABLE INITIALLY DEFERRED`: bitta
-- LedgerTransaction uchun bir nechta LedgerEntry KETMA-KET insert qilinadi
-- (bitta DB tranzaksiyasi ichida) — oraliq holat tabiiy ravishda balanssiz
-- (masalan birinchi entry yozilgach hali ikkinchisi yo'q), shuning uchun
-- tekshiruv COMMIT vaqtigacha kechiktiriladi. `LedgerService`ni chetlab
-- o'tib xom INSERT/backfill skript yozilsa ham bu YAGONA himoya qatlami
-- baribir ushlaydi.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_ledger_transaction_balanced() RETURNS TRIGGER AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total FROM ledger_entries WHERE "transactionId" = NEW."transactionId";
  IF total <> 0 THEN
    RAISE EXCEPTION 'ledger_entries: transaction % balanslanmagan (sum=%)', NEW."transactionId", total;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced_check
AFTER INSERT ON "ledger_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_ledger_transaction_balanced();

-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (6): A4/T1 append-only REVOKE — `src/common/db/
-- append-only.constants.ts` bilan BIR XIL ro'yxat. Uchala ledger jadvali
-- ham TO'LIQ append-only (bo'lim 8/20/49): xato tuzatish FAQAT kelajakdagi
-- reversal-journal orqali, eski qator hech qachon UPDATE/DELETE qilinmaydi.
-- (Parallel-birinchi-marta-account-yaratish poygasi UPDATE huquqisiz,
-- `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` orqali yechiladi — `LedgerService`.)
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  app_role text := COALESCE(NULLIF(current_setting('bobododa.app_role', true), ''), 'bobododa_app');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'ledger_accounts', app_role);
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'ledger_transactions', app_role);
    EXECUTE format('REVOKE UPDATE, DELETE ON %I FROM %I', 'ledger_entries', app_role);
  END IF;
END
$$;
