-- Agar eski test ma'lumotlarida dublikat faol to'lovlar bo'lsa, eng birinchisidan boshqalarini FAILED holatiga o'tkazamiz
UPDATE payments
SET status = 'FAILED', "failureReason" = 'DUPLICATE_CONCURRENT_PAYMENT_SUPERSEDED', "failedAt" = now()
WHERE id IN (
  SELECT p.id
  FROM payments p
  INNER JOIN (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "contractId" ORDER BY "createdAt" ASC, id ASC) as rn
    FROM payments
    WHERE status IN ('PENDING', 'PROCESSING')
  ) sub ON p.id = sub.id
  WHERE sub.rn > 1
);

-- Endi bitta shartnomada bir vaqtda faqat BITTA faol (PENDING yoki PROCESSING) to'lov bo'lishini ta'minlovchi partial unique index
CREATE UNIQUE INDEX "payments_contract_active_uidx" ON "payments"("contractId") WHERE "status" IN ('PENDING', 'PROCESSING');
