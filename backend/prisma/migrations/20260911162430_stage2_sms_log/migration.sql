-- CreateTable
CREATE TABLE "sms_logs" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_logs_phone_createdAt_idx" ON "sms_logs"("phone", "createdAt");
