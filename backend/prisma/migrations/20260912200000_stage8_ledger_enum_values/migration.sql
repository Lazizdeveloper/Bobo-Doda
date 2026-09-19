-- Bosqich 8, bo'lim 68 (Bosqich 7'dagi bo'lim 73 saboqi) — MUSTAQIL
-- migratsiya: PostgreSQL yangi qo'shilgan enum qiymatini SHU TRANZAKSIYA
-- commit bo'lgunicha ISHLATISHGA yo'l qo'ymaydi. Keyingi migratsiya
-- (`stage8_dispute`) `DISPUTE_HOLD`/`DISPUTE_RESOLUTION`/`DISPUTE_HOLD_
-- RELEASE` qiymatlaridan foydalanadigan HECH QANDAY DML qilmaydi (faqat
-- jadval yaratadi) — shunga qaramay, enum qiymatlarini ALOHIDA, OLDINGI
-- migratsiyada commit qilish Bosqich 7'dagi bilan bir xil xavfsiz naqsh
-- (real `prisma migrate deploy` bilan tekshirilgan).
ALTER TYPE "LedgerAccountType" ADD VALUE 'DISPUTE_HOLD';

ALTER TYPE "LedgerTransactionType" ADD VALUE 'DISPUTE_HOLD';
ALTER TYPE "LedgerTransactionType" ADD VALUE 'DISPUTE_RESOLUTION';
ALTER TYPE "LedgerTransactionType" ADD VALUE 'DISPUTE_HOLD_RELEASE';
