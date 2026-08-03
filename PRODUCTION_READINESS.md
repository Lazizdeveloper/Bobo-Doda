# Bobo&Doda production readiness

Holat: frontend mahsulot oqimlari tayyor; real launch server va operatsion
infratuzilmasiz mumkin emas.

## P0 — launchni bloklaydi

1. `lib/mock-api` o‘rniga autentifikatsiyalangan server API.
2. PostgreSQL kabi tranzaksion ma’lumotlar bazasi va migratsiyalar.
3. OTP/Telegram tasdiqlashning server implementatsiyasi, rate limit va session
   rotation.
4. Click/Payme merchant shartnomalari, server-side payment yaratish, imzo
   tekshirish, idempotency va webhook.
5. Escrow uchun double-entry ledger, reconciliation, refund va chargeback.
6. KYC hujjatlari uchun shifrlangan object storage, antivirus tekshiruvi,
   retention va moderator paneli.
7. Nizo/support uchun admin panel, SLA, audit log va moderator rollari.
8. Huquqiy matnlarni faoliyat yuritiladigan mamlakatlar bo‘yicha yurist
   tasdiqlashi.

## P1 — public launchdan oldin

- Password reset, phone-change va session/device management server oqimlari.
- Email/SMS/Telegram notification delivery va unsubscribe mexanizmi.
- Fayllarni signed URL orqali yuklash, content scanning va download policy.
- Search index, pagination, server-side filter va abuse/spam nazorati.
- Observability: structured logs, error tracking, metrics va alertlar.
- Backup/restore sinovi va disaster recovery rejasi.
- Fraud rules: velocity limits, account linking, suspicious payout hold.
- Soliq/fiskal chek va marketplace komissiya hisoboti.
- FX: har bir yozuvning asl valyutasi, kurs manbasi, rounding va settlement
  qoidalari. Kurs bo‘lmaguncha UI faqat UZS ko‘rsatadi.

## P2 — o‘sish bosqichi

- Buyer kompaniya profili va jamoaviy accountlar.
- Mutaxassis paketlari, recurring contract va hourly work.
- Tavsiya/matching, saved search va alertlar.
- Referral/promo, analytics va cohort reporting.
- Mobil ilovalar va push notification.

## Frontend tekshiruv mezonlari

- `npm run lint`
- `npm run build`
- 360, 390, 430, 768, 1024 va 1280px responsive smoke test
- Klaviatura navigatsiyasi, focus trap/restore va screen-reader label tekshiruvi
- Payment/KYC/dispute uchun success, pending, failed, retry va blocked holatlari
- UZ/RU/EN tarjima completeness

