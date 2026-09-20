-- Bosqich 7, bo'lim 73 — MUSTAQIL migratsiya (himoya sifatida): PostgreSQL
-- qoidasi — "ALTER TYPE ... ADD VALUE tranzaksiya blokida bajarilsa, yangi
-- qiymat SHU TRANZAKSIYA commit bo'lgunicha ISHLATILA OLMAYDI". Keyingi
-- migratsiya (`stage7_refund_payout`) `REFUND_CLEARING` qiymatidan
-- foydalanadigan INSERT (bootstrap platform account) qiladi — shuning uchun
-- enum qiymatlari ALOHIDA, OLDINGI migratsiyada, ALOHIDA tranzaksiyada
-- commit qilinishi SHART (real `prisma migrate deploy` bilan tekshirilgan).
ALTER TYPE "LedgerAccountType" ADD VALUE 'REFUND_CLEARING';
ALTER TYPE "LedgerAccountType" ADD VALUE 'PAYOUT_CLEARING';

ALTER TYPE "LedgerTransactionType" ADD VALUE 'REFUND';
ALTER TYPE "LedgerTransactionType" ADD VALUE 'PAYOUT_RESERVATION';
ALTER TYPE "LedgerTransactionType" ADD VALUE 'PAYOUT_RELEASE';
