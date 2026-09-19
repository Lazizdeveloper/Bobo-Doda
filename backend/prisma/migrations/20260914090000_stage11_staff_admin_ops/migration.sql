-- Bosqich 11 — Staff/Admin operations + TOTP management + moderation hardening.

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- AlterTable: yangi ustunlar avval QO'SHILADI (defaultlar bilan) — hech
-- qanday NOT NULL ustun mavjud qatorlarni buzmaydi.
ALTER TABLE "staff_members"
  ADD COLUMN "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "statusReason" TEXT,
  ADD COLUMN "statusChangedAt" TIMESTAMPTZ(6),
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pendingTotpSecret" TEXT,
  ADD COLUMN "pendingTotpExpiresAt" TIMESTAMPTZ(6),
  ADD COLUMN "lastTotpCounter" INTEGER;

-- Ma'lumot ko'chirish: eski "isActive" qiymatini YANGI "status"ga
-- moslashtiramiz — isActive=false eng yaqin ma'noda DISABLED (doimiy
-- o'chirilgan), chunki eski modelda "vaqtinchalik"/"doimiy" farqi UMUMAN
-- yo'q edi — operator keyinroq kerak bo'lsa qo'lda SUSPENDED'ga o'tkazadi.
UPDATE "staff_members" SET "status" = 'DISABLED' WHERE "isActive" = false;

-- Eski ustun endi keraksiz.
ALTER TABLE "staff_members" DROP COLUMN "isActive";

-- Bosqich 11, bo'lim 9 — TOTP siri endi SHIFRLANGAN saqlanadi
-- (`totp-secret-cipher.util.ts`). Bu DB'da HALI plaintext qator YO'Q edi
-- (tekshirilgan: `SELECT count(*) WHERE "totpSecret" IS NOT NULL` = 0),
-- lekin himoya sifatida — agar biror muhitda bo'lsa — eski (endi
-- decrypt qilib bo'lmaydigan) qatorlarni tozalab qo'yamiz, MFA login
-- butunlay yopilib qolmasin (qayta enroll qilish talab etiladi).
UPDATE "staff_members" SET "totpSecret" = NULL, "mfaEnabled" = false WHERE "totpSecret" IS NOT NULL;

-- CreateIndex
CREATE INDEX "staff_members_status_createdAt_idx" ON "staff_members"("status", "createdAt");

-- CreateIndex — bo'lim 57: `GET /staff/users`/`GET /staff/sellers` filtrlash.
CREATE INDEX "users_status_createdAt_idx" ON "users"("status", "createdAt");
CREATE INDEX "users_sellerStatus_createdAt_idx" ON "users"("sellerStatus", "createdAt");

-- Bo'lim 38/57 — `audit_logs` uchun kompozit indekslar YAKKA
-- `actorId`/`action` indekslarini ALMASHTIRADI (dublikat bo'lmasin —
-- kompozitning yetakchi ustuni yakka-ustun so'rovlarni ham xizmat qiladi).
DROP INDEX "audit_logs_actorId_idx";
DROP INDEX "audit_logs_action_idx";
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
