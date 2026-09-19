-- Bosqich 21 — parol bilan login. Oddiy login endi telefon+parol (SMS
-- ISHTIROK ETMAYDI); SMS FAQAT ro'yxatdan o'tish va parolni tiklashda,
-- telefon egaligini isbotlash uchun. Bosqich 20'dagi AuthIntent.LOGIN
-- qiymati endi ma'nosiz (login OTP arxitekturasi olib tashlandi), shuning
-- uchun enum OtpPurpose'ga almashtiriladi (REGISTER, PASSWORD_RESET).

-- Eski OTP qatorlari qisqa umrli (5 daqiqa) — barchasi allaqachon eskirgan,
-- ma'lumot yo'qotish xavfi yo'q. LOGIN qiymatli qatorlarni yangi enum'ga
-- to'g'ridan-to'g'ri cast qilib bo'lmaydi, shuning uchun tozalanadi.
TRUNCATE TABLE "otp_codes";

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'PASSWORD_RESET');

-- AlterTable: ustun nomi ham "intent"dan "purpose"ga o'zgaradi (bosqich 21
-- konsepsiyasiga mos — "bu challenge nima MAQSADda" endi to'g'riroq nom).
ALTER TABLE "otp_codes" RENAME COLUMN "intent" TO "purpose";
ALTER TABLE "otp_codes" ALTER COLUMN "purpose" TYPE "OtpPurpose" USING ("purpose"::text::"OtpPurpose");

DROP TYPE "AuthIntent";

DROP INDEX "otp_codes_phone_intent_createdAt_idx";
CREATE INDEX "otp_codes_phone_purpose_createdAt_idx" ON "otp_codes"("phone", "purpose", "createdAt");

-- CreateTable: OTP tasdiqlangandan keyin, yakuniy amal (User yaratish /
-- parol almashtirish) bajarilgunga qadar berilgan qisqa umrli grant.
-- `tokenHash` — RefreshToken/StaffSession bilan bir xil naqsh: xom token
-- DB'da saqlanmaydi, faqat SHA-256.
CREATE TABLE "auth_grants" (
    "id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" UUID,
    "tokenHash" TEXT NOT NULL,
    "consumedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_grants_tokenHash_key" ON "auth_grants"("tokenHash");
CREATE INDEX "auth_grants_expiresAt_idx" ON "auth_grants"("expiresAt");

ALTER TABLE "auth_grants" ADD CONSTRAINT "auth_grants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
