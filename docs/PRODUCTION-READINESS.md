# Production Readiness — Bobo&Doda backend

Bosqich 12 natijasi. Bu hujjat production launch oldidan tekshiriladigan
YAGONA checklist — har band `docs/RUNBOOK.md`ning tegishli bo'limiga
havola beradi (batafsil kontekst uchun).

Ustuvorlik tartibi (loyihaning hamma qarorlarida qo'llaniladi): **Protocol
correctness > Financial correctness > Provider idempotency > Ledger
integrity > Security > Recoverability > Production operability >
Convenience.**

## 1. Provider credentiallari

- [ ] `PAYME_MERCHANT_ID` — Payme Business kabinetidagi kassa ID
- [ ] `PAYME_LOGIN` — odatda `Paycom` (Payme Business bizga shu login bilan murojaat qiladi)
- [ ] `PAYME_KEY` — kassa qo'shilgandan keyin berilgan parol/kalit
- [ ] `PAYME_CHECKOUT_URL=https://checkout.paycom.uz` (production — `test.paycom.uz` EMAS)
- [ ] Hech biri `.env`/kod ichida commit qilinmagan (`git log -p` bilan tarixiy tekshiruv ham)
- [ ] CLICK — implement qilinmagan (`CLICK_PROVIDER_IMPLEMENTATION = BLOCKED_BY_OFFICIAL_SPEC`), credential kerak emas

## 2. DNS / TLS

- [ ] Production domen DNS to'g'ri backend instance'ga ko'rsatadi
- [ ] TLS sertifikat amal qiladi (reverse proxy/platform darajasida — backend o'zi TLS terminatsiya qilmaydi)
- [ ] Payme Business kabinetidagi "Endpoint URL" `https://<domain>/api/v1/payments/payme` ga sozlangan va tashqi tarmoqdan REACHABLE (firewall/security group tekshirilgan)

## 3. Muhit o'zgaruvchilari (env)

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` — `bobododa_app` roli (MIGRATOR EMAS)
- [ ] `DATABASE_MIGRATION_URL` — `bobododa_migrator` roli (faqat migratsiya CLI)
- [ ] `REDIS_URL` — production Redis (auth/TLS provayder talabiga qarab)
- [ ] `JWT_ACCESS_SECRET` / `JWT_STAFF_ACCESS_SECRET` — ≥32 belgi, tasodifiy, `.env.example` placeholder EMAS
- [ ] `STAFF_TOTP_ENCRYPTION_KEY` — 64 hex belgi, tasodifiy
- [ ] `PAYMENT_PROVIDER=PAYME` (`TEST` EMAS)
- [ ] `PAYOUT_PROVIDER` — hozircha faqat `TEST` mavjud (real payout rail Bosqich 12 scope'idan tashqarida — bo'lim 12 qarang)
- [ ] `SMS_PROVIDER=CONSOLE` — bu HAM production'da xavfli (real SMS yubormaydi); real provider ulanmaguncha OTP/bildirishnoma email/boshqa kanal orqali qo'lda kuzatilishi kerak
- [ ] `SWAGGER_ENABLED=false`
- [ ] `DB_ROLE_ASSERTION=on` (yoki sukut — `off` production'da Zod darajasida IMKONSIZ)
- [ ] `CORS_ORIGINS` — faqat haqiqiy frontend/admin domenlari (vergul bilan)
- [ ] `TRUST_PROXY` — deployment topologiyasiga mos (reverse proxy bo'lsa `true` yoki aniq hop-son/CIDR)
- [ ] Stale/ishlatilmaydigan env kalitlar (`.env.example`ni joriy `env.schema.ts` bilan solishtirib) olib tashlangan/hujjatlashtirilgan

## 4. DB

- [ ] `bobododa_migrator` != `bobododa_app` (alohida rollar, RUNBOOK §3)
- [ ] Boot vaqtida F1 assertion (`DB_ROLE_ASSERTION=on`) ishlaydi — noto'g'ri rol bilan app ko'tarilmaydi
- [ ] Append-only jadvallar (`APPEND_ONLY_TABLES`) uchun `bobododa_app`da UPDATE/DELETE huquqi YO'Q (migratsiya + F1 ikkalasi ham tasdiqlangan)
- [ ] Connection pool — oqilona chegara (managed Postgres provayder tavsiyasiga qarab, "unlimited" emas)
- [ ] TLS — provayder talab qilsa `sslmode=require` (yoki teng) `DATABASE_URL`da

## 5. Redis

- [ ] Auth (parol/ACL) — agar hosting provayder talab qilsa
- [ ] TLS — agar provayder qo'llasa/talab qilsa
- [ ] Reconnect strategiyasi — `ioredis`/BullMQ sukut qiymatlari (eksponensial backoff) — maxsus sozlash shart emas, lekin monitoring qilinsin
- [ ] In-memory fallback YO'Q (haqiqiy Redis instance, har doim)

## 6. Migratsiyalar

- [ ] `npx prisma migrate status` — "up to date" (kutilmagan pending migratsiya yo'q)
- [ ] Deploy CI/CD bosqichi migratsiyani ALOHIDA qadam sifatida bajaradi (app boot ICHIDA emas — RUNBOOK §12 "Deployment ketma-ketligi")
- [ ] Zero-downtime qoidasi (expand/contract) yangi migratsiyalar uchun ham qo'llaniladi

## 7. Financial preflight

- [ ] `npm run financial:check` — exit 0, CRITICAL anomaliya yo'q
- [ ] Dev-only tarixiy anomaliyalar (agar bo'lsa) production checklist'ida SILENT whitelist QILINMAGAN — har biri ko'rib chiqilgan/hal qilingan

## 8. Outbox cutover

- [ ] Fresh production (birinchi marta) — cutover skripti (`npm run outbox:cutover`) SHART EMAS, backlog yo'q
- [ ] Eski muhitdan migratsiya bo'lsa — RUNBOOK §10'dagi stale-backlog siyosati qo'llanilgan, worker YOQILISHIDAN OLDIN

## 9. Provider cutover

RUNBOOK §12 "Provider cutover checklist" (to'liq) — qisqacha:

- [ ] TEST provider hech qanday production muhitda emas
- [ ] Real credential to'liq va tekshirilgan
- [ ] Callback (Endpoint) URL HTTPS orqali reachable
- [ ] Provider auth (Basic) ishlayotgani tasdiqlangan
- [ ] Sandbox oqimi tekshirilgan (quyida)
- [ ] `financial:check` o'tgan

## 10. Backup / Restore

- [ ] Backup strategiyasi hujjatlashtirilgan (RUNBOOK §12) va provayder darajasida FAOL
- [ ] Restore drill KAMIDA bir marta staging/test DB'da bajarilgan va natija yozib qo'yilgan
- [ ] Ledger/Audit jadvallari (append-only) backup ustuvorligida ALOHIDA ta'kidlangan

## 11. Monitoring / Health

- [ ] `/health/live`, `/health/ready` ishlaydi (DB + Redis, tashqi provider'ga LIVE so'rov YO'Q — provider outage appni unready qilmaydi)
- [ ] Operatsion metrikalar accessible (RUNBOOK'dagi "metric-ready counter"lar — HTTP xatolar, payment success/failure, reconciliation anomaliya, outbox DEAD/oldest-pending)
- [ ] Alert shartlari hujjatlashtirilgan (pastga qarang)

### Alert shartlari (threshold, tashqi alerting tizimi uydirilmagan)

```text
/health/ready muvaffaqiyatsiz          → darhol (on-call)
financial_anomalies (CRITICAL) > 0     → darhol
outbox DEAD soni o'sib boryapti        → 15 daqiqa ichida tekshirish
eng eski PENDING outbox qatori         → OUTBOX_RETRY_MAX_SECONDS'dan 2x oshsa
reconciliation run muvaffaqiyatsiz     → ketma-ket 3 marta bo'lsa
provider auth xatolari (Payme -32504)  → kutilmagan hajmda ko'paysa (config muammosi belgisi)
payment amount mismatch audit yozuvi   → HAR BIRI ko'rib chiqiladi (potentsial fraud/bug)
```

## 12. Rollback rejasi

- [ ] App kodi rollback qilinsa HAM joriy DB schema bilan mos ishlaydi (expand/contract qoidasi tufayli)
- [ ] Migratsiya "down" skriptlari AVTOMATIK ishlatilmaydi (destructive) — muammo bo'lsa roll-FORWARD (tuzatuvchi yangi migratsiya) afzal
- [ ] Provider (`PAYMENT_PROVIDER`) flag — muammo chiqsa `TEST`ga qaytarib bo'lmaydi (production'da fail-closed) — REAL incident bo'lsa checkout vaqtincha o'chirish frontend/feature-flag darajasida bo'lishi kerak, backend darajasida emas

## 13. Staff / Security

- [ ] Kamida bitta `SUPER_ADMIN` mavjud, parol o'zgartirilgan (temp password EMAS)
- [ ] `mustChangePassword` hard gate ishlayotgani tasdiqlangan (`test/staff-admin.e2e-spec.ts`)
- [ ] TOTP — kamida SUPER_ADMIN hisoblar uchun tavsiya etiladi (majburiy emas, operatsion qaror)
- [ ] Login rate-limiting faol (email+IP, RUNBOOK §11)

## 14. Sandbox verification

```text
PAYME_PROTOCOL: PASS   — test/payme.e2e-spec.ts (26 test, real Postgres)
PAYME_SANDBOX:  NOT_RUN — real Payme sandbox credential bu sessiyada yo'q edi

CLICK_PROTOCOL: BLOCKED — rasmiy docs.click.uz texnik sahifalari o'qilmadi (JS SPA)
CLICK_SANDBOX:  NOT_RUN
```

Real `PAYME_MERCHANT_ID`/`PAYME_LOGIN`/`PAYME_KEY` (sandbox) qo'lga
kiritilgach: `https://test.paycom.uz` bilan checkout oqimini boshidan
oxirigacha (checkout → CheckPerformTransaction → CreateTransaction →
PerformTransaction) qo'lda bajaring va bu bo'limni yangilang. Credential
yo'qligida PASS deb YOZILMAYDI.
