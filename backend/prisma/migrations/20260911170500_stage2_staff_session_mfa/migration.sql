-- AlterTable
ALTER TABLE "staff_members" ADD COLUMN     "totpSecret" TEXT;

-- AlterTable
ALTER TABLE "staff_sessions" ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "staff_sessions_tokenHash_key" ON "staff_sessions"("tokenHash");
