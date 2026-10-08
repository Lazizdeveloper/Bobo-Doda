-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetMin" BIGINT NOT NULL,
    "budgetMax" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "skillsRequired" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "screeningQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proposalsCount" INTEGER NOT NULL DEFAULT 0,
    "status" "job_status" NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMPTZ(6),
    "attachedImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_buyerId_status_idx" ON "jobs"("buyerId", "status");

-- CreateIndex
CREATE INDEX "jobs_status_createdAt_idx" ON "jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "jobs_categoryId_status_idx" ON "jobs"("categoryId", "status");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Grant privileges for app role
DO $$
DECLARE
    app_role text := COALESCE(current_setting('app.db_app_role', true), 'bobododa_app');
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "jobs" TO %I', app_role);
    END IF;
END $$;
