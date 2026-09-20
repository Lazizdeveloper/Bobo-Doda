-- Bosqich 20 — Login va Registration alohida oqim. OTP challenge endi
-- LOGIN yoki REGISTER niyatiga bog'lanadi, shuning uchun bitta oqim uchun
-- so'ralgan kod ikkinchisini tasdiqlay olmaydi.

-- CreateEnum
CREATE TYPE "AuthIntent" AS ENUM ('LOGIN', 'REGISTER');

-- AlterTable: mavjud (barchasi allaqachon muddati o'tgan — OTP 5 daqiqada
-- eskiradi) qatorlar buzilmasligi uchun vaqtinchalik DEFAULT bilan
-- qo'shiladi, so'ng default olib tashlanadi — kelajakdagi HAR bir yozuv
-- ANIQ intent bilan kelishi SHART (aks holda `OtpService` kompilyatsiya
-- vaqtida xato beradi, sukut qiymatga tayanib jim qolmaydi).
ALTER TABLE "otp_codes" ADD COLUMN "intent" "AuthIntent" NOT NULL DEFAULT 'LOGIN';
ALTER TABLE "otp_codes" ALTER COLUMN "intent" DROP DEFAULT;

-- Eski indeks endi `intent`ni ham qamrab oladi (verify so'rovi shu
-- ustunlar bo'yicha filtrlaydi).
DROP INDEX "otp_codes_phone_createdAt_idx";
CREATE INDEX "otp_codes_phone_intent_createdAt_idx" ON "otp_codes"("phone", "intent", "createdAt");
