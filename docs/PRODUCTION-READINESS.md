# Production Readiness — Bobo&Doda backend

Bosqich 12/13 natijasi. Bu hujjat production launch oldidan tekshiriladigan
YAGONA checklist — har band `docs/RUNBOOK.md`ning tegishli bo'limiga
havola beradi (batafsil kontekst uchun, ayniqsa §13).

Ustuvorlik tartibi (loyihaning hamma qarorlarida qo'llaniladi): **Protocol
correctness > Financial correctness > Provider idempotency > Ledger
integrity > Security > Recoverability > Production operability >
Convenience.**

## 1. Provider credentiallari

- [ ] `PAYME_MERCHANT_ID` — Payme Business kabinetidagi kassa ID
- [ ] `PAYME_LOGIN` — odatda `Paycom` (Payme Business bizga shu login bilan murojaat qiladi)
- [ ] `PAYME_KEY` — kassa qo'shilgandan keyin berilgan parol/kalit
- [ ] `PAYME_CHECKOUT_URL=https://checkout.paycom.uz` (production — `test.paycom.uz` EMAS)
- [ ] `PLAYMOBILE_API_URL` — portalda ro'yxatdan o'tgach beriladigan real endpoint (Bosqich 13)
- [ ] `PLAYMOBILE_LOGIN` / `PLAYMOBILE_PASSWORD` — PlayMobile shaxsiy kabinetidan
- [ ] `PLAYMOBILE_SENDER` — tasdiqlangan sender nomi (≤11 belgi)
- [ ] Hech biri `.env`/kod ichida commit qilinmagan (`git log -p` bilan tarixiy tekshiruv ham)
- [ ] CLICK — implement qilinmagan (`CLICK_PROVIDER_IMPLEMENTATION = BLOCKED_BY_OFFICIAL_SPEC`, Bosqich 13'da qayta tekshirildi — o'zgarish yo'q), credential kerak emas
- [ ] Real payout rail hali tanlanmagan — `PAYOUTS_ENABLED=false` bilan launch (bo'lim 3/9 qarang) YOKI real rail tanlanguncha kutish, biznes qaroriga bog'liq

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
- [ ] `PAYOUTS_ENABLED=false` (real payout rail hali rasmiy tanlanmagan — Bosqich 13, RUNBOOK §13) — YOKI real rail tanlangach `PAYOUT_PROVIDER` yangilanadi
- [ ] `SMS_PROVIDER=PLAYMOBILE` (`CONSOLE` EMAS) + `PLAYMOBILE_*` to'liq (Bosqich 13)
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

- [ ] `npx prisma migrate status` — "up to date" (kutilmagan pending migratsiya yo'q). Mexanizm (Phase 1→12 barcha migratsiya, genuinely BO'SH DB) Bosqich 13'da bir marta dry-run bilan tasdiqlangan (RUNBOOK §13) — bu HAR BIR haqiqiy deploy'da QAYTA tekshiriladi, bir martalik dry-run kifoya EMAS
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
- [ ] Restore drill KAMIDA bir marta staging/test DB'da bajarilgan va natija yozib qo'yilgan — Bosqich 13'da `pg_dump`/`pg_restore` bilan bir marta bajarildi (RUNBOOK §13, `RESTORE_DRILL=PASS`); bu PROVIDER'NING avtomatik backup/restore mexanizmi (RDS/Cloud SQL snapshot) bilan ALMASHTIRMAYDI — production'ga chiqqach provider-darajasidagi drill HAM qilinishi kerak
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
PAYME_PROTOCOL:      PASS    — test/payme.e2e-spec.ts (26 test, real Postgres)
PAYME_SANDBOX:       NOT_RUN — real Payme sandbox credential bu sessiyada yo'q edi

PLAYMOBILE_PROTOCOL: PASS    — provider/util unit testlar (20 test, rasmiy PDF fixture'lariga mos)
PLAYMOBILE_LIVE:     NOT_RUN — real PlayMobile credential bu sessiyada yo'q edi

CLICK_PROTOCOL: BLOCKED — rasmiy docs.click.uz texnik sahifalari o'qilmadi (JS SPA), Bosqich 13'da qayta tekshirildi, o'zgarish yo'q
CLICK_SANDBOX:  NOT_RUN

PAYOUT_PROTOCOL: N/A — real rail hali tanlanmagan, PAYOUTS_ENABLED=false bilan feature xavfsiz o'chirilgan (Bosqich 13)
```

Real `PAYME_MERCHANT_ID`/`PAYME_LOGIN`/`PAYME_KEY` (sandbox) qo'lga
kiritilgach: `https://test.paycom.uz` bilan checkout oqimini boshidan
oxirigacha (checkout → CheckPerformTransaction → CreateTransaction →
PerformTransaction) qo'lda bajaring va bu bo'limni yangilang. Real
`PLAYMOBILE_LOGIN`/`PLAYMOBILE_PASSWORD` qo'lga kiritilgach — bitta haqiqiy
OTP SMS yuborib, yetkazilganini tasdiqlang. Credential yo'qligida
HECH QAYSI bo'lim PASS deb YOZILMAYDI.

## 15. Frontend integratsiyasi (Bosqich 17) — ikki bosqichli status

Bu bo'lim shu hujjatning qolgan qismidan (sof backend/infra) FARQLI: u
`/lib/api` real backend'ga ulanganini va shu integratsiya doirasida
tekshirilgan/ochiq qolgan narsalarni qamraydi. To'liq texnik tafsilot —
RUNBOOK §14.

**CODE_RELEASE_CANDIDATE: HA.** Xaridor+mutaxassis oqimlari (OTP kirish,
bozor, to'g'ridan-to'g'ri xarid, shartnoma qabul/rad, escrow to'lovi,
bosqich topshirish/qabul/o'zgartirish so'rash, nizo ochish/ko'rish/qaytarib
olish, shartnoma yakunlanishi) va admin panelning "asosiy moliyaviy/nazorat"
qismi (Foydalanuvchilar, Nizolar+hal qilish, To'lovlar+Qaytarish,
Shartnomalar, Audit) haqiqiy backend'ga ulangan; `npm run lint`/`tsc`/
`build`/`check:csp` toza, real Postgres+Redis'ga ulangan backend bilan
brauzerda (Playwright, headless Chromium) qo'lda **to'liq** tasdiqlangan:
1. Xaridor: OTP kirish → rol tanlash → bozor → sozlamalar.
2. **Ikki aktyor, to'liq escrow tsikli**: xaridor xizmat sotib oladi →
   mutaxassis qabul qiladi (`imzolangan`→`faol`) → xaridor "To'lash"ni
   bosadi → to'lov yaratiladi (TEST provider) → TEST webhook qo'lda
   imzolanib yuborilgan (HMAC-SHA256, `x-test-signature`) → to'lov
   `SUCCEEDED` → sotuvchi "mablag'langan" holatini ko'radi → bosqichni
   topshiradi → xaridor qabul qiladi → shartnoma **`COMPLETED`**.
3. **Nizo**: xaridor faol+mablag'langan shartnomada nizo ochadi → sotuvchi
   shartnoma sahifasida nizoni ko'radi → xaridor uni qaytarib oladi.

Shu tekshiruv jarayonida **UCHTA real xato topilib, TUZATILDI** (barchasi
`tests/e2e/purchase-lifecycle.spec.ts`+`disputes.spec.ts` orqali
regressiyadan himoyalangan, RUNBOOK §14):
1. Xaridorning "To'lash" tugmasi HAR safar faol+mablag'lanmagan kontraktni
   ochganda ~2 daqiqaga yashiringan edi (polling holati optimistik
   `"processing"` bilan boshlangani sabab) — yangi xarid qilgan xaridor
   to'lovni DARHOL boshlay olmasdi.
2. Sotuvchi HECH QACHON "mablag'langan" holatini ko'rmasdi — `hydrateContract`
   sotuvchi uchun `funded=true` hisoblasa ham, `mapContract` `fundedAt`ni
   doim `undefined` qaytarardi (sahifa `!!contract.fundedAt`ga tayanadi) —
   sotuvchi hech qachon real to'lovdan keyin ham ishni "bemalol boshlash
   mumkin" degan belgini ko'rmasdi.
3. Nizo ochish HAR DOIM 422 (`IDEMPOTENCY_KEY_REQUIRED`) bilan
   muvaffaqiyatsiz bo'lardi — `disputesService.open()` backend MAJBURIY
   talab qiladigan `Idempotency-Key` header'ini yubormasdi. Kengroq audit
   paytida YANA IKKITASI (xuddi shu naqsh) topildi va tuzatildi:
   `staffResolveDispute` va `staffCreateRefund` (`lib/api/admin.ts`) —
   ya'ni admin panelning nizo-hal-qilish va qaytarish-yaratish amallari
   ham xuddi shunday har doim muvaffaqiyatsiz bo'lardi.

**Formal Playwright E2E to'plami YOZILDI VA TIRIK TASDIQLANDI** —
`playwright.config.ts` + `tests/e2e/` (6 spec fayl, 11 test: auth, bozor,
to'liq xarid-to'lov-yakunlanish tsikli, nizo, sotuvchi xizmatlari, admin —
oxirgisi staff credential berilmasa tushunarli sabab bilan skip qilinadi).
`npm run test:e2e:live`. **10/10 ishlaydigan test (admin tashqari) real
Postgres+Redis'ga ulangan backend bilan to'liq o'tdi** — jumladan to'liq
xarid→to'lov→topshirish→yakunlanish tsikli va nizo oqimi ikkalasi ham
uchdan-uchgacha real HTTP orqali tasdiqlandi (webhook qo'lda imzolanib).

Birinchi tirik ishga tushirishda **YANA IKKITA muammo** (endi tuzatilgan)
suite'ning O'ZIDA (ilova kodida EMAS) topildi:
- `storageState` snapshot'ini bir nechta mustaqil brauzer kontekst/fayl
  orasida qayta ishlatish refresh token bir martalik ekanini hisobga
  olmagan edi (rotatsiya + qayta-ishlatish aniqlash — to'g'ri xavfsizlik
  xatti-harakati) — ikkinchi mustaqil kontekst "TOKEN_REUSED" bilan
  yiqilardi. Tuzatildi: har bir spec fayl endi `test.beforeAll`da O'ZINING
  jonli login sessiyasini ochadi (`tests/e2e/helpers.ts` —
  `loginBuyer`/`setupApprovedSeller`), fayl faylga QAYTA ISHLATILMAYDI.
- Xizmat yaratish wizard testi "Bajarish muddati" maydonini to'ldirmagan
  edi (faqat narxni) — validatsiya to'g'ri bloklagan, test noto'g'ri yozilgan.

**REAL OTP IP-soatlik chegarasi bu suite'ni qanday shakllantirgani** —
o'quv ahamiyatga ega: backend IP bo'yicha soatiga 20 ta
`/auth/otp/request`ni cheklaydi (barcha telefon raqamlari birgalikda
hisoblanadi, konfiguratsiya qilinmaydi) + har bir raqam kuniga 10 tagacha.
Qo'lda tirik test paytida bu ikkala chegaraga ham urilib to'xtab qolindi —
suite shu tajribadan qurilgan: har fayl FAQAT bitta (yoki ikkita, ikki
aktyor kerak bo'lsa) real login qiladi, to'liq suite ~7 ta OTP so'rov
sarflaydi (soatiga ~2-3 marta ishga tushirish mumkin).

**Tekshirilmagan/ochiq qolgan qismlar:**
- **Staff/admin login brauzerda TASDIQLANMAGAN.** Lokal DB'dagi yagona
  staff hisobi (`ops-phase4@bobododa.uz`) paroli noma'lum (oldingi
  sessiyada qo'lda yaratilgan, hujjatlashtirilmagan) — parol hash'ini
  bilib turib qayta yozish (yoki yangi hisob uchun yangi hash yaratish)
  avtomatik ravishda "secret-store write" sifatida BLOKLANDI (to'g'ri
  ehtiyot chorasi, ikki marta qayta urinilmadi), shuning uchun bu qadam
  ATAYLAB bajarilmadi. Real production'da bu muammo emas — har bir
  SUPER_ADMIN birinchi login'da `mustChangePassword` orqali o'z parolini
  o'zi qo'yadi (RUNBOOK §11). `tests/e2e/admin.spec.ts` shu sabab bilan
  skip holatda qoladi (`E2E_STAFF_EMAIL`/`E2E_STAFF_PASSWORD` berilguncha).
- **OTP rate-limit — real, hujjatlashtirilgan kashfiyot.** Backend IP
  bo'yicha soatiga 20 ta `/auth/otp/request`ni cheklaydi (barcha telefon
  raqamlari birgalikda hisoblanadi, konfiguratsiya qilinmaydi) + har bir
  raqam kunига 10 tagacha. Qo'lda tirik test paytida bu chegaraga ikki
  marta urilib to'xtab qolindi (RUNBOOK §14) — E2E suite shuni hisobga
  olib qurilgan (yuqoriga qarang), lekin real deploy/CI muhitida ham shu
  chegara amal qiladi — ko'p marta ketma-ket smoke-test ishga tushirish
  rejalashtirilsa shu bilan hisoblashish kerak.

**REAL_PRODUCTION_READY: BLOCKED_BY_INFRASTRUCTURE** (bo'lim 1/14 bilan
bir xil sabab — real Payme/PlayMobile credential yo'q, real payout rail
tanlanmagan). Frontend tomonidan qo'shimcha blokировка YO'Q — backend
tayyor bo'lgach frontend kod o'zgarishisiz ishlaydi (`NEXT_PUBLIC_API_URL`
production domenga almashadi, xolos).
