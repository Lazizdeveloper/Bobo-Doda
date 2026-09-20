-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SellerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'PAUSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "sellerStatus" "SellerStatus" NOT NULL DEFAULT 'NOT_APPLIED',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusChangedAt" TIMESTAMPTZ(6),
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "suspendedUntil" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "seller_applications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "status" "SellerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),
    "reviewedByStaffId" UUID,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "seller_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'uz',
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "deliveryDays" INTEGER NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMPTZ(6),
    "reviewedAt" TIMESTAMPTZ(6),
    "reviewedByStaffId" UUID,
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_applications_userId_status_idx" ON "seller_applications"("userId", "status");

-- CreateIndex
CREATE INDEX "seller_applications_status_submittedAt_idx" ON "seller_applications"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "services_sellerId_status_idx" ON "services"("sellerId", "status");

-- CreateIndex
CREATE INDEX "services_status_createdAt_idx" ON "services"("status", "createdAt");

-- CreateIndex
CREATE INDEX "services_categoryId_status_idx" ON "services"("categoryId", "status");

-- AddForeignKey
ALTER TABLE "seller_applications" ADD CONSTRAINT "seller_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan: PARTIAL UNIQUE INDEX — bitta user'da ko'pi bilan BITTA
-- PENDING seller arizasi bo'lishi mumkin. Prisma schema `@unique` orqali
-- partial index'ni ifodalay olmaydi (B4'dagi bilan bir xil sabab —
-- docs/03-schema-review.md), shuning uchun ilova mantig'iga (race-prone)
-- emas, DB CONSTRAINT'ga tayanamiz: parallel ikkita so'rov bir vaqtda
-- INSERT qilishga urinsa, ikkinchisi unique_violation (Postgres kodi 23505)
-- bilan RAD ETILADI — `SellerApplicationService` buni ushlab
-- `SELLER_APPLICATION_ALREADY_PENDING` domain xatosiga aylantiradi.
-- ─────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "seller_applications_one_pending_per_user"
  ON "seller_applications" ("userId")
  WHERE "status" = 'PENDING';
