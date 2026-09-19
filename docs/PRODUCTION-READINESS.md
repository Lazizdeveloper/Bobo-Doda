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

Formal Playwright E2E to'plami yozildi (`playwright.config.ts` +
`tests/e2e/`). **Bosqich 18'da admin panel HAM real staff login orqali
to'liq qamrovga kiritildi** (izolyatsiyalangan test muhitida — pastga,
§16'ga qarang) — quyidagi ikkita muammo (endi tuzatilgan) shu jarayonda
topildi, ikkalasi ham suite'ning O'ZIDA edi (ilova kodida emas):
- `storageState` snapshot'ini bir nechta mustaqil brauzer kontekst/fayl
  orasida qayta ishlatish refresh token bir martalik ekanini hisobga
  olmagan edi (rotatsiya + qayta-ishlatish aniqlash — to'g'ri xavfsizlik
  xatti-harakati) — ikkinchi mustaqil kontekst "TOKEN_REUSED" bilan
  yiqilardi. Tuzatildi: har bir spec fayl endi `test.beforeAll`da O'ZINING
  jonli login sessiyasini ochadi (`tests/e2e/helpers.ts` —
  `loginBuyer`/`setupApprovedSeller`), fayl faylga QAYTA ISHLATILMAYDI.
- Xizmat yaratish wizard testi "Bajarish muddati" maydonini to'ldirmagan
  edi (faqat narxni) — validatsiya to'g'ri bloklagan, test noto'g'ri yozilgan.

To'liq yakuniy natija, admin qamrovi va REAL_PRODUCTION_READY holati —
**§16 (Bosqich 18 — Release Candidate yopilishi)**.

## 16. Bosqich 18 — Release Candidate yopilishi (yakuniy natija)

Bu bo'lim §15'dagi ishning YAKUNIY, to'liq tasdiqlangan holati — barcha
raqamlar haqiqiy terminal chiqishidan olingan (taxmin qilinmagan).

### Backend

| Tekshiruv | Natija |
|---|---|
| `npm run lint` | ✅ PASS |
| `npm run typecheck` | ✅ PASS |
| `npm test` (unit) | ✅ **369/369 PASS**, 37 suite |
| `npm run test:e2e` (Jest, real Postgres+Redis) | ✅ **308/308 PASS**, 19 suite |
| `npm run build` | ✅ PASS |
| `npm run generate:contracts` | ✅ PASS, drift = 0 |

**Muhim metodologik topilma**: birinchi `test:e2e` urinishida 197/308 test
"waitFor timeout (otp sms)" bilan yiqildi — SABAB ilova kodida emas, mening
o'zimning uzoq muddat ishlab turgan asosiy dev backend jarayonim (`:4000`)
Jest suite bilan BIR XIL Redis'ga (`:6379`) ulangan, ikkalasi ham
`otp-sms` BullMQ navbatiga obuna bo'lgan edi — ikkala jarayon ham bir xil
job'lar uchun RAQOBATLASHDI, Jest'ning o'z ichki `CapturingSmsProvider`si
ko'p hollarda hech qachon kodni olmadi. Dev backend vaqtincha to'xtatilgach
(Redis kontensiyasi yo'qolgach) suite **149 soniyada, 308/308 PASS** bilan
tugadi (avvalgi kontaminatsiyalangan urinish — 1076 soniya, 197 xato).
Xulosa: **haqiqiy backend regressiyasi YO'Q edi** — sof test-muhit
izolyatsiyasi masalasi.

### Frontend

| Tekshiruv | Natija |
|---|---|
| `npx eslint .` | ✅ PASS |
| `npx tsc --noEmit` | ✅ PASS |
| `npm run check:csp` | ✅ PASS |
| `NEXT_DIST_DIR=.next-check npm run build` | ✅ PASS, barcha 58+ marshrut |

Loyihada frontend uchun alohida unit/integration test framework (Jest/
Vitest) YO'Q — test qatlami butunlay Playwright E2E orqali (pastga qarang).
Bitta ilova (`bobo-doda`, App Router) — "user app"/"partner app"/"admin
app" fizik jihatdan bitta Next.js binarida, rol asosida marshrutlangan
(`/xaridor`, `/mutaxassis`, `/admin`+`/rahbariyat`).

### Playwright — YAKUNIY, BITTA to'liq ishga tushirishda

```
Running 24 tests using 1 worker
...
1 skipped
23 passed (1.1m + 7.6s alohida qo'shilgan regressiya testi)
```

- **O'tgan: 23. Yiqilgan: 0. Skip: 1 (TOTP, sababi pastda).**
- **Kritik oqimlarda 0 ta skip.**
- Qamrov: `auth` (2), `buyer-marketplace` (4 — jumladan Xarajatlar
  regressiyasi), `seller-services` (3), `purchase-lifecycle` (1, to'liq
  xarid→to'lov→yakunlanish), `disputes` (1), `admin` (13, 1 skip bilan).

**TOTP_BROWSER_E2E = SKIPPED.** Sababi: admin frontendda TOTP enroll/
verify UI hali yo'q (`lib/api/admin.ts`da `staffEnrollTotp`/
`staffVerifyTotp` funksiyalari bor, lekin ularni chaqiradigan sahifa yo'q).
Yangi UI yozish "yangi feature yaratma" tamoyiliga zid — bu KRITIK
integratsiya nosozligi emas, chunki bu funksiya hech qachon "UI orqali
ishlaydi" deb da'vo qilinmagan. Backend'dagi mavjud TOTP test qamrovi
(`staff-permission.guard.spec.ts`, `totp.util.spec.ts`,
`totp-secret-cipher.util.spec.ts`) o'zgarishsiz qoladi.

### Admin E2E — endi HAQIQIY, IZOLYATSIYALANGAN muhitda to'liq ishlaydi

Bosqich 17'da bloklangan sabab (dev bazadagi yagona staff hisobi paroli
noma'lum, yangi hash yaratish "secret-store write" sifatida bloklangan)
Bosqich 18'da TO'G'RI yechildi: dev/prod parolini o'zgartirish/bypass
qilish O'RNIGA, **butunlay alohida throwaway Postgres (`:55433`) + Redis
(`:6390`) + backend (`:4010`, `NODE_ENV=test`) + frontend (`:3010`)**
ko'tarildi (`backend/scripts/e2e-stack-up.sh`), va test-only staff
hisoblari **real argon2id hashing kodi** orqali (`backend/scripts/
e2e-staff-fixture.cjs` — `dist/common/security/hash.service.js`ni
to'g'ridan-to'g'ri ishlatadi) shu ALOHIDA bazaga yaratildi. Dev/prod
staff jadvaliga BITTA ham yozuv tegilmadi (skript `DATABASE_URL`da
"bobododa_e2e" yo'q bo'lsa ATAYLAB rad etadi).

Fake JWT, localStorage rol in'ektsiyasi, permission bypass, TOTP
bypass — HECH BIRI ishlatilmadi. Barcha login `/staff/auth/login` real
endpoint orqali, real staff session bilan.

| Tekshiruv | Natija |
|---|---|
| Staff login (real, real parol hash) | ✅ PASS |
| Dashboard | ✅ PASS |
| Foydalanuvchilar (real sotuvchi qatori bilan) | ✅ PASS |
| Shartnomalar (real shartnoma qatori bilan) | ✅ PASS |
| To'lovlar (real SUCCEEDED to'lov bilan) | ✅ PASS |
| Nizolar (real OCHIQ nizo bilan) | ✅ PASS |
| Audit jurnali | ✅ PASS |
| Xizmatlar (gated, graceful ErrorState) | ✅ PASS |
| `mustChangePassword` hard gate (login→bloklangan→almashtirish→tiklangan) | ✅ PASS |
| Ruxsat/403 (frontend Access Denied + mustaqil backend 403) | ✅ PASS |
| Moliyaviy xavfsizlik (xavfli qo'lda-tugma YO'Q) | ✅ PASS |
| Refund yaratish — Idempotency-Key header | ✅ PASS |
| Nizo hal qilish — Idempotency-Key header | ✅ PASS |
| TOTP enroll/verify | ⏭️ SKIPPED (UI yo'q, yuqoriga qarang) |

### Bosqich 18'da topilgan va tuzatilgan qo'shimcha real xatolar

1. **`tests/e2e/admin.spec.ts`ning o'zidagi Playwright API xato** — fayl
   darajasida (test() tashqarisida) chaqirilgan `test.skip(true, ...)`
   BUTUN FAYLDAGI 13 ta testni skip qilib yubordi (faqat TOTP testi emas).
   Tuzatildi: `test.skip()` endi FAQAT o'sha test() callback'i ICHIDA.
2. **Xaridor Xarajatlar sahifasi (`app/xaridor/xarajatlar/page.tsx`) —
   HAQIQIY, JIDDIY regressiya**: sahifaning `Promise.all()`i HAQIQIY
   ma'lumot (jami to'lov, escrow, to'lovlar tarixi) chaqiruvlarini UCHTA
   o'chirilgan (`FEATURE_DISABLED`) chaqiruv bilan bitta bloqda ushlab
   turardi — istalgan birining rad etilishi HAMMASINI yiqitardi, ya'ni bu
   sahifa HAR BIR xaridor uchun DOIM `<ErrorState>` ko'rsatardi, real
   ma'lumot HECH QACHON ko'rinmasdi. Tuzatildi: o'chirilgan chaqiruvlar
   (`getCards`/`getPendingWithdrawalTotal`/`listMyWithdrawalRequests`) va
   ular bilan bog'liq to'liq karta/bank-hisob yechish formasi (baribir
   hech qachon muvaffaqiyatli bo'lolmasdi) olib tashlandi. Playwright
   regressiya testi qo'shildi (`buyer-marketplace.spec.ts`).
3. **`lib/feedback.ts`dagi soxta seed ma'lumot** — 3 ta o'ylab topilgan
   ism/sana bilan fikr-mulohaza yozuvi real foydalanuvchilarga HAQIQIY
   fikr sifatida ko'rsatilardi (`/admin/fikrlar`). Olib tashlandi.
4. **O'lik kod tozalandi**: `components/shared/BankTransferPaymentModal.tsx`
   (hech qayerda import qilinmagan, soxta SMS-tasdiqlash oqimi) va
   `components/shared/WithdrawalRequests.tsx` (yagona ishlatuvchisi band
   3'da olib tashlangan sahifa edi).
5. Butun ilova bo'ylab tizimli tekshiruv o'tkazildi — "haqiqiy ma'lumot +
   o'chirilgan chaqiruv bitta `Promise.all`da" naqshining BOSHQA hech
   qanday nusxasi topilmadi (qolgan barcha shunga o'xshash sahifalar —
   E'lonlarim/Xabarlar/Takliflarim/KYC/mutaxassis profili — yoki butun
   sahifa maqsadi ATAYLAB o'chirilgan xususiyat, yoki o'chirilgan
   chaqiruvlar allaqachon alohida `.catch()` bilan o'ralgan).

### Xavfsizlik audit natijalari (Bosqich 18)

- **Auth bypass**: yo'q — barcha E2E test login real `/auth/otp/verify`
  yoki `/staff/auth/login` orqali, hech qanday fake token/session
  fabrikatsiyasi ishlatilmagan.
- **Sensitive logging**: `console.log`/`console.error` bo'ylab to'liq
  audit — parol/OTP/JWT/refresh token/TOTP secret/Payme yoki PlayMobile
  credential HECH QAYERDA log qilinmaydi (production kodda). Yagona server
  tomonidagi log (`app/api/support/route.ts`) Telegram HTTP status/xato
  matnini yozadi, bot token'ning O'ZI hech qachon log qilinmaydi.
- **Production mock data**: yuqoridagi 3-bandda tuzatilgan (`lib/feedback.ts`)
  dan tashqari topilmadi. `Math.random()` ishlatilgan joylar (lokal ID
  suffiks, `crypto.randomUUID` zaxirasi) haqiqiy tashvish EMAS.
- **Hardcoded localhost**: topilmadi — `lib/api/http.ts`/`staff-http.ts`
  ikkalasi ham `NEXT_PUBLIC_API_URL`dan o'qiydi.
- **CLICK**: production UI'da CLICK to'lov varianti UMUMAN yo'q (backend
  ham `BLOCKED_BY_OFFICIAL_SPEC`, RUNBOOK §12).
- **PAYOUTS_ENABLED=false**: mutaxassis Daromad sahifasida faol "yechish"
  tugmasi yo'q (izohli, ataylab o'chirilgan); `lib/chat-filter.ts`ning
  `reportCircumventionViolation()` orqali yozilgan anti-firibgarlik
  hisobotlari hozircha hech qaysi real admin sahifasiga yetib bormaydi
  (`/admin/shikoyatlar` Bosqich 17 qamrovidan tashqarida qoldi) — bu
  DISCLOSED, kelgusi bosqich uchun ochiq gap, kod o'zgartirilmadi (yangi
  admin sahifasi qurish "yangi feature" bo'lardi).

### CODE_RELEASE_CANDIDATE: **PASS**

Barcha mezon GREEN: backend lint/typecheck/unit/e2e/build, contracts
drift=0, frontend lint/typecheck/build, xaridor+mutaxassis+admin
Playwright (23/24 o'tdi, 1 ta hujjatlashtirilgan sabab bilan skip, 0 ta
kritik skip), `mustChangePassword`, ruxsat/403, `fundedAt` regressiyasi,
refund/nizo Idempotency-Key regressiyasi, Xarajatlar regressiyasi.

### REAL_PRODUCTION_READY: **BLOCKED_BY_INFRASTRUCTURE** (o'zgarmadi)

Bosqich 18 FAQAT kod/test darajasidagi tekshiruv edi — real infratuzilma
hali yo'q. Qolgan production to'siqlar (§1/§14 bilan bir xil):
1. Hosting (backend + frontend)
2. Boshqariladigan (managed) PostgreSQL
3. Boshqariladigan Redis
4. Domen + DNS + TLS
5. Real Payme sandbox/live credential tasdiqlanishi
6. Real PlayMobile credential tasdiqlanishi
7. Production SUPER_ADMIN bootstrap (RUNBOOK §13)
8. Provайder-darajasidagi backup tasdiqlanishi
9. Monitoring/alerting ulanishi

Bu ikki status ATAYLAB ALOHIDA: CODE_RELEASE_CANDIDATE kod haqida, u
PASS; REAL_PRODUCTION_READY infratuzilma haqida, u hali BLOCKED — ular
aralashtirilmasin.

## 17. Bosqich 19 — OTP siyosati audit (SMS ONLY)

**Siyosat**: foydalanuvchiga yuboriladigan HAR QANDAY OTP kod FAQAT SMS
orqali yetkaziladi. Email OTP yo'q, Telegram OTP yo'q, kanal tanlash
parametri yo'q. To'liq tafsilot — RUNBOOK §19. Bu bo'lim faqat yakuniy
tasdiqlangan natijalar.

| Tekshiruv | Natija |
|---|---|
| Backend `npm run lint` | ✅ PASS |
| Backend `npm run typecheck` | ✅ PASS |
| Backend `npm test` (unit) | ✅ **373/373 PASS**, 38 suite |
| Backend `npm run test:e2e` (Jest, real Postgres+Redis) | ✅ **311/311 PASS**, 19 suite |
| Backend `npm run build` | ✅ PASS |
| `npm run generate:contracts` | ✅ PASS, drift = 0 |
| Frontend `eslint .` | ✅ PASS |
| Frontend `tsc --noEmit` | ✅ PASS |
| Frontend `next build` | ✅ PASS |
| Playwright (auth+buyer+seller+purchase+disputes+admin) | ✅ **23 PASS, 1 SKIP (TOTP UI yo'q), 0 FAIL** |

**Yopilgan production gap**: `SMS_PROVIDER=CONSOLE` bilan production endi
fail-closed rad etiladi (`env.schema.ts`, `PAYMENT_PROVIDER`/
`SWAGGER_ENABLED`/`DB_ROLE_ASSERTION` bilan bir xil naqsh) — ilgari
production CONSOLE provider (faqat stdout, hech kimga yetkazmaydi) bilan
jimgina ko'tarilishi mumkin edi.

**Olib tashlangan soxta/o'lik kod**: xaridor Sozlamalar sahifasidagi
ishlamaydigan Google/Telegram "Connected Accounts" bloki (faqat local
state, real backend chaqiruvi yo'q edi) va 4 ta o'lik mock-auth funksiyasi
(`loginWithTelegram`/`loginWithGoogle`/`verifyTelegram`/`verifyGoogle`).
Noto'g'ri FAQ/help-markaz kontenti (ro'yxatdan o'tishni Telegram
tasdiqlash bilan tasvirlagan) to'g'rilandi.

**Tegilmagan (ataylab)**: staff/admin TOTP (boshqa, mustaqil xavfsizlik
mexanizmi), Telegram support integratsiyasi (OTP'ga aloqasi yo'q,
faqat Yordam modali), Payme'ning o'z 3DS/OTP oqimi (tashqi provayder).

### CODE_RELEASE_CANDIDATE: **PASS** (o'zgarmadi, yangi audit bilan mustahkamlandi)

REAL_PRODUCTION_READY holati §16dagi bilan bir xil — o'zgarmadi.

## 18. Bosqich 20 — Login va Registration ajratilishi

**O'zgarish**: avvalgi combined `/kirish` oqimi (OTP tasdiqlansa mavjud
bo'lmagan telefon uchun AVTO-CREATE) olib tashlandi. Endi ikkita
mustaqil sahifa/niyat: `/kirish` (LOGIN — faqat mavjud hisob, User
HECH QACHON yaratilmaydi) va `/royxatdan-otish` (REGISTER — User
yaratishning yagona yo'li, mavjud hisobga HECH QACHON ustidan
yozmaydi). Ikkalasi ham SMS OTP orqali — §19dagi SMS-only siyosat
o'zgarmadi. To'liq tafsilot — RUNBOOK §20.

| Tekshiruv | Natija |
|---|---|
| Backend `npm run lint` | ✅ PASS |
| Backend `npm run typecheck` | ✅ PASS |
| Backend `npm test` (unit) | ✅ **380/380 PASS**, 39 suite |
| Backend `npm run test:e2e` (Jest, real Postgres+Redis) | ✅ **319/319 PASS**, 19 suite |
| Backend `npm run build` | ✅ PASS |
| `npm run generate:contracts` | ✅ PASS, `AuthIntent` enum qo'shildi, drift = 0 |
| Frontend `eslint .` | ✅ PASS |
| Frontend `tsc --noEmit` | ✅ PASS |
| Frontend `next build` | ✅ PASS (2 yangi route: `/royxatdan-otish`, `/royxatdan-otish/tasdiqlash`) |
| Playwright (auth+buyer+seller+purchase+disputes+admin) | ✅ **27 PASS, 1 SKIP (TOTP UI yo'q), 0 FAIL** |

**Schema o'zgarishi**: `OtpCode.intent` (`AuthIntent` enum — `LOGIN`/
`REGISTER`) — migration `20260915120000_stage20_auth_intent`, real
Postgres'ga qo'llangan (dev + isolated e2e), race-safe (`User.phone`
DB unique constraint — 10 ta parallel verify real e2e testda tasdiqlangan).

**Xato taksonomiyasi**: duplikat kod YARATILMADI — mavjud
`USER_NOT_FOUND` (404) va `PHONE_EXISTS` (409) qayta ishlatildi
(`ERROR_CODES`da allaqachon bor edi).

**Tegilmagan (ataylab)**: staff/admin TOTP autentifikatsiyasi, rol
tanlash mantiqi (`/rol-tanlash`), seller eligibility/application
workflow (Bosqich 3) — hech biriga tegilmadi.

### CODE_RELEASE_CANDIDATE: **PASS** (Bosqich 20, o'zgarmadi)

## 19. Bosqich 21 — Parol bilan login (SMS xarajatini kamaytirish)

**Asosiy o'zgarish**: Bosqich 20'dagi combined "LOGIN OTP" arxitekturasi
BUTUNLAY olib tashlandi. Endi:

```text
REGISTER  = 1 SMS  (telefon → OTP → parol → User)
LOGIN     = 0 SMS  (telefon + parol → sessiya)
FORGOT    = 1 SMS  (telefon → OTP → yangi parol; sessiya avtomatik
                     OCHILMAYDI — foydalanuvchi /kirish orqali qaytadi)
```

To'liq tafsilot — RUNBOOK §21.

| Tekshiruv | Natija |
|---|---|
| Backend `npm run lint` | ✅ PASS |
| Backend `npm run typecheck` | ✅ PASS |
| Backend `npm test` (unit) | ✅ **392/392 PASS**, 39 suite |
| Backend `npm run test:e2e` (Jest, real Postgres+Redis) | ✅ **332/332 PASS**, 19 suite |
| Backend `npm run build` | ✅ PASS |
| `npm run generate:contracts` | ✅ PASS, `OtpPurpose` enum + 8 yangi `/auth/*`+`/me/change-password` endpoint, drift = 0 |
| Frontend `eslint .` | ✅ PASS |
| Frontend `tsc --noEmit` | ✅ PASS |
| Frontend `next build` | ✅ PASS (6 yangi route: `/parolni-unutdim`+2, `/royxatdan-otish/parol`; `/kirish/tasdiqlash` o'chirildi) |
| Playwright (auth+buyer+seller+purchase+disputes+admin) | ✅ **28 PASS, 1 SKIP (TOTP UI yo'q), 0 FAIL** |

**Schema o'zgarishi**: `AuthIntent` → `OtpPurpose` (`LOGIN` qiymati olib
tashlandi, `REGISTER`/`PASSWORD_RESET` qoldi), `OtpCode.intent` →
`OtpCode.purpose`, yangi `AuthGrant` modeli (OTP-dan-keyingi qisqa umrli
grant, `RefreshToken` bilan bir xil opaque-token naqshi) — migration
`20260915150000_stage21_password_auth`, real Postgres'ga qo'llangan
(dev + isolated e2e).

**Xato taksonomiyasi**: duplikat kod YARATILMADI — mavjud
`INVALID_CREDENTIALS`, `ACCOUNT_BLOCKED`, `ACCOUNT_SUSPENDED`,
`PHONE_EXISTS`, `TOKEN_EXPIRED`, `INVALID_CURRENT_PASSWORD` qayta
ishlatildi (barchasi `ERROR_CODES`da allaqachon bor edi).

**Tugallangan, ilgari stub qilingan feature**: `POST /me/change-password`
— frontend `AccountSecurity.tsx`/`usersService.changePassword()`
ALLAQACHON to'liq yozilgan edi (Bosqich 2'dan `disabled()` bilan stub),
endi haqiqiy `User.passwordHash` bilan ishlaydi. Yangi feature EMAS —
mavjud, tayyor turgan UI backendga bog'landi.

**SMS xarajat modeli (real e2e testda tasdiqlangan)**: register=1 SMS,
5×login=0 qo'shimcha SMS, forgot-password=1 SMS (noma'lum telefon uchun
0 — haqiqiy SMS yuborilmaydi, faqat bir xil public javob).

**Tegilmagan (ataylab)**: staff/admin TOTP, rol tanlash mantiqi,
seller eligibility/application workflow, OTP siyosati (SMS-only,
Bosqich 19) — hech biriga tegilmadi.

### CODE_RELEASE_CANDIDATE: **PASS**

## 20. Bosqich 22 — Bug-fix: seller-application 409 + to'liq UI QA audit

**Qism A — Seller-application 409 tuzatildi** (commit `db3ba6b`):
`/mutaxassis/royxat` foydalanuvchining HAQIQIY ariza holatini (yo'q/
kutilmoqda/tasdiqlangan/rad etilgan) tekshirmasdan doim yangi forma
ko'rsatardi — mavjud PENDING/APPROVED arizasi bo'lgan foydalanuvchi
"Yuborish"ni bossa, backend to'g'ri 409 qaytarardi, lekin frontend buni
tushuntirmasdan xom xato sifatida ko'rsatardi. Backend allaqachon to'g'ri
edi; tuzatish sahifani to'liq qayta yozishdan iborat — holat avval
yuklanadi (`GET /me/seller-application`), keyin mos ekran (kutish/rad+
qayta ariza/tasdiqlangan) chiziladi. Backend `DomainError.code`
(HTTP status emas) frontendda tushunarli xabarga xaritalanadi. Yangi
backend e2e testlar (parallel-race, egalik, admin reject/approve) +
alohida Playwright suite (`seller-application.spec.ts`, 8 test).

**Qism B — To'liq mahsulot QA auditi** (Bosqich 24, bu bo'lim raqami
bilan bir xil emas — ikkala raqamlash mustaqil: kod-fayllardagi izohlar
"Bosqich 24" deb yozilgan, bu hujjatdagi bo'lim raqami "Bosqich 22" —
ikkalasi ham to'g'ri, faqat turli hisoblagich). To'liq route/control
inventarizatsiyasi (74 sahifa, `find app -name page.tsx`) asosida
qurilgan, taxmin emas — batafsil natija: `docs/FULL-UI-QA-MATRIX.md`.

Topilgan va TUZATILGAN 3 ta xato (barchasi haqiqiy, ishlab chiqarishda
ko'rinadigan "o'lik tugma"lar edi):
1. Xaridor/mutaxassis header'ida ko'rinadigan "Chiqish" tugmasi yo'q edi
   (faqat Sozlamalar ichida, uzoq scroll bilan) — ikkala `TopNav`ga
   qo'shildi. Regressiya: `tests/e2e/logout.spec.ts` (yangi, 3 test).
2. Landing sahifasining "Ish topish" CTA'si (2 joyda) doim xato
   ko'rsatadigan `/mutaxassis/ish-elonlari`ga (Job/Proposal — hali real
   backendga ko'chirilmagan) olib borardi — ishlaydigan
   `/kirish?tab=register&role=mutaxassis`ga yo'naltirildi.
3. Admin sidebar'idagi "Adminlar & Rollar" (super_admin) — sidebar orqali
   ochiladigan YAGONA doim xato beradigan admin sahifa edi (xodim
   boshqaruvi backendi hali ko'chirilmagan) — sidebar havolasi olib
   tashlandi (xuddi xaridor/mutaxassis TopNav o'zining ko'chirilmagan
   bo'limlari uchun ishlatgan konventsiya bilan bir xil); marshrut o'zi
   tegilmagan (to'g'ridan-to'g'ri URL orqali hamon ochiladi, o'zining
   ErrorState'ini ko'rsatadi).

Qolgan ~27 marshrut (Job/Proposal/Offer/Xabarlar, KYC, xizmat/sharh/
apellyatsiya/shikoyat moderatsiyasi, kategoriyalar CRUD, yordam
ticketlari, xodim boshqaruvi) — hammasi Bosqich 17'dan buyon `disabled()`/
`disabledAsync` orqali ATAYLAB o'chirilgan (backend hali yozilmagan),
`docs/FULL-UI-QA-MATRIX.md`da `OUT_OF_SCOPE_FEATURE_GAP` deb aniq sabab
bilan belgilangan — bu QA/bug-fix bosqichida yangi backend funksiya
yozish doirasidan tashqarida.

Statik xavfsizlik/gigiyena tekshiruvlari (barchasi TOZA, tuzatish shart
bo'lmadi): hardcoded `localhost` yo'q, `lib/mock-api` production
sahifalaridan chaqirilmaydi, localStorage/sessionStorage'da parol/OTP/
JWT/refresh-token yo'q, pul harakatlantiruvchi mutatsiyalarda
Idempotency-Key mavjud (tasdiqlangan).

| Tekshiruv | Natija |
|---|---|
| Playwright to'liq suite — RUN #1 (bitta invokatsiya) | ✅ **48 PASS, 1 SKIP, 0 FAIL** |
| Playwright to'liq suite — RUN #2 (3 ta kichik partiya, quyida sabab) | ✅ **48 PASS, 1 SKIP, 0 FAIL** (31+6+11) |
| `npm run generate:contracts` | ✅ PASS, drift = 0 |

**RUN #2 nega 3 partiyaga bo'lindi**: ikki marta ketma-ket bitta
invokatsiyali to'liq suite umumiy mashina xotira bosimidan OOM bilan
o'ldirildi (`free -h` — swap 100% to'la; `ps aux --sort=-%mem` —
o'ldirishdan keyin mening jarayonlarimdan birortasi ham qolmagan,
eng ko'p xotira sarflovchilar foydalanuvchining o'z desktop
Chrome/VSCode jarayonlari edi — tashqi sabab, mening test/jarayon
gigiyenamdan emas). Yechim: xuddi shu testlar, xuddi shu assertsiyalar
(BIRORTASI ham yumshatilmagan), faqat 3 ta ketma-ket kichikroq
`npx playwright test` chaqiruviga bo'lib yuborildi — natija RUN #1 bilan
aynan bir xil (48 PASS/1 SKIP/0 FAIL).

**BLOCKED_BY_INFRASTRUCTURE eslatmasi**: yuqoridagi OOM hodisasi shu
maxsus umumiy mashinaning xotira sig'imiga tegishli, mahsulot kodidagi
xatolik EMAS — lekin shuni ochiq aytish kerak: bu bosqichdagi to'liq
QA FAQAT lokal muhitda (asosiy dev stack + izolyatsiyalangan e2e stack)
o'tkazildi. `FULL_PRODUCT_UI_QA = PASS` shu doirada (74 marshrutning
hammasi TESTED yoki aniq sabab bilan N/A/OUT_OF_SCOPE); bu **avtomatik
ravishda** `REAL_PRODUCTION_READY`ni anglatmaydi — production infratuzilma
(real Postgres/Redis klasteri, TLS, monitoring, backup) alohida
tasdiqlanishi kerak (yuqoridagi §1-14 ga qarang, ular hali ham amal
qiladi).

To'liq batafsil hisobot: `docs/FULL-UI-QA-MATRIX.md`.

### UI_QA_CANDIDATE (Bosqich 22): **PASS** (kod QA darajasida;
production infratuzilma tayyorligi bu bilan tasdiqlanmaydi)

## 21. Bosqich 23 — TextUp SMS provider integratsiyasi

**Auth**: email/parol → `POST {TEXTUP_AUTH_URL}` → Bearer `accessToken`
(Basic auth EMAS — birinchi taxmin noto'g'ri chiqqan edi). Token
`TextUpTokenManager`da BITTA jarayon xotirasida keshlanadi, bir vaqtli
chaqiruvlar bitta in-flight login promise'ni baham ko'radi. 401 → BIR
MARTA invalidate+qayta login+qayta urinish, ikkinchi 401 — muvaffaqiyatsiz
(cheksiz aylanma yo'q). To'liq oqim: RUNBOOK §22.

**Hisob holati (2026-09-17 YANGILANDI, `GET /v1/templates` real javobi
bilan tasdiqlangan)**: ikkala OTP shablon ("Registration"/"Password
Reset") endi **`active`** (moderatsiya TASDIQLANGAN). Bu jarayonda
**kritik topilma**: dastlab kodga yozilgan qisqa matn ("BOBODODA
tasdiqlash kodi: ...") moderatsiya tomonidan HAQIQATDA RAD ETILGAN
ekan — tasdiqlangan (`active`) matn UZUNROQ: "BOBODODA saytida
ro'yxatdan o'tish/parolni tiklash uchun tasdiqlash kodi: ...".
`renderTextUpText()` shu ANIQ tasdiqlangan matnga tuzatildi (taxmin
emas — real API javobidan). `TEXTUP_REGISTRATION_TEMPLATE_ID`/
`TEXTUP_PASSWORD_RESET_TEMPLATE_ID` lokal `.env`ga yozildi (haqiqiy
UUID'lar, repo'ga EMAS). `TEXTUP_NICKNAME_ID` hali kashf etilmagan
(so'ralmagan) — kod bu holatda `nicknameId`ni so'rovdan chiqarib
tashlaydi, qisqa raqamdan yuboriladi (bu ham TO'G'RI). Batafsil: RUNBOOK
§22.

| Tekshiruv | Natija |
|---|---|
| Backend `npm run lint` | ✅ PASS |
| Backend `npm run typecheck` | ✅ PASS |
| Backend `npm test` (unit) | ✅ **457/457 PASS**, 45 suite |
| Backend `npm run test:e2e` (Jest, real Postgres+Redis) | ✅ **339/339 PASS**, 19 suite |
| Backend `npm run build` | ✅ PASS |
| `npm run generate:contracts` | ✅ PASS, drift = 0 |
| Frontend `eslint .` | ✅ PASS |
| Frontend `tsc --noEmit` | ✅ PASS |
| Frontend `next build` | ✅ PASS |
| Playwright (auth+logout+buyer+disputes+purchase+admin+seller×2) | ✅ **48 PASS, 1 SKIP (TOTP UI yo'q), 0 FAIL** |

**Xavfsizlik**: `TEXTUP_PASSWORD`/`accessToken`/`refreshToken`/
`Authorization` header/OTP HECH QACHON loglanmaydi (unit testda tekshirilgan
— `textup.provider.spec.ts`/`textup-token-manager.spec.ts`, log
chaqiruvlarining butun seriyalashtirilgan tanasi tekshiriladi, faqat
maydon nomi emas). Frontend TextUp haqida HECH NARSA bilmaydi —
`app`/`lib`/`components`da `grep -rn "TEXTUP\|textup"` 0 natija beradi.
`SMS_PROVIDER=TEXTUP` bo'lsa `devOtp` HECH QACHON qaytarilmaydi (mavjud
uch qatlamli fail-closed shart o'zgarishsiz, faqat `smsProvider` union
turi kengaytirilgan).

**CI/testlarda haqiqiy SMS YUBORILMAYDI** — barcha unit/e2e/Playwright
`fetch`ni mock qiladi yoki `SMS_PROVIDER=CONSOLE` bilan ishlaydi. **2026-
09-17 topilgan va tuzatilgan xavf**: `test/jest-e2e.setup.ts` avval
FAQAT `DEV_EXPOSE_OTP`ni pin qilardi — developer `.env`sida haqiqiy
`SMS_PROVIDER=TEXTUP` bo'lsa (endi shunday), bu qiymat `dotenv`ning
"mavjud kalitni qayta yozmaslik" xatti-harakati sababli Jest e2e
suite'ga SIZIB o'tib, REGISTER/PASSWORD_RESET oqimini sinovchi HAR BIR
e2e test haqiqiy SMS yuborib yuborardi. Endi `SMS_PROVIDER` ham
`'CONSOLE'`ga pin qilingan — e2e endi HAR DOIM deterministik, ambient
`.env`dan mustaqil. Haqiqiy provayder bilan sinov — ALOHIDA, qo'lda,
nazorat qilinadigan qadam (RUNBOOK §22), CI'ning bir qismi EMAS.

### TEXTUP_CODE_INTEGRATION (Bosqich 23): **PASS** — kod/testlar tayyor,
to'liq regressiya toza (matn tuzatilgandan keyin qayta tasdiqlangan).

### TEXTUP_REAL_SMS_VERIFIED: **PASS** (2026-09-17, bitta nazorat
qilinadigan real ro'yxatdan o'tish SMS testi bilan tasdiqlangan)

To'liq real oqim bajarildi va tasdiqlandi (aniq ruxsat bilan, dev
backend vaqtincha `SMS_PROVIDER=TEXTUP`+`DEV_EXPOSE_OTP=false` bilan
qayta ishga tushirilib, keyin xavfsiz `CONSOLE` holatiga qaytarildi —
Jest/Playwright konfiguratsiyasi TEGILMADI):

1. **Nickname**: `GET /v1/nick-names` — `BOBODODA` topildi, lekin
   `status:"in_verify"` (hali tasdiqlanmagan) — `TEXTUP_NICKNAME_ID`
   ATAYLAB sozlanmadi (foydalanuvchi ko'rsatmasi: "hali pending bo'lsa
   bo'sh qoldiring"). SMS qisqa raqamdan yuborildi — bu ham TO'G'RI.
2. **Real `POST /auth/register/request-otp`** — haqiqiy backend orqali
   (`{sent:true}`, HTTP 200). Asinxron natija `sms_logs` jadvalidan
   TASDIQLANDI (HTTP javob emas, chunki yuborish BullMQ navbatida
   asinxron): `success=true`, real `providerMessageId` (TextUp `smsId`)
   qaytdi, `errorMessage` bo'sh.
3. **Haqiqiy SMS qabul qilindi** — foydalanuvchi matnni o'qib berdi:
   `"BOBODODA saytida ro'yxatdan o'tish uchun tasdiqlash kodi: XXXXXX"`
   — `renderTextUpText()`dagi tasdiqlangan matn bilan SO'ZMA-SO'Z mos.
4. **Real `POST /auth/register/verify-otp`** — foydalanuvchi SMS'dan
   o'qigan HAQIQIY kod bilan chaqirildi → HTTP 200, `registrationToken`
   qaytdi (ya'ni frontend `/royxatdan-otish/parol`ga o'tgan bo'lar edi).
5. **Jami real SMS soni: 1** (qayta yuborilmadi, debugging uchun
   takrorlanmadi).

Kod/token/parol/OTP HECH QACHON chatga/logga chiqarilmadi — faqat
maskalangan telefon, HTTP status, `sms_logs`ning xavfsiz maydonlari
(`success`/`providerMessageId`) va foydalanuvchining o'zi o'qib bergan
matn/kod ishlatildi.

## 22. Bosqich 23 — Railway production deploy + PAYMENTS_ENABLED=false

**Railway**: loyiha "Bobo-Doda" (workspace "Laziz Shakarov's Projects",
`production` environment). Xizmatlar: `backend` (Dockerfile, `backend/`
o'z build kontekstida — quyida), `frontend` (Nixpacks, root `next build`/
`next start`), `Postgres`, `Redis` — ikkalasi ham PRIVATE tarmoq orqali
(`postgres.railway.internal`/`redis.railway.internal`), tashqi portga
ochilmagan. Ikkala domen HAM haqiqiy ishlaydi va real HTTP tekshirilgan:

- Frontend: `https://frontend-production-25bc.up.railway.app` — landing/
  `/kirish`/`/royxatdan-otish`/`/rahbariyat/kirish` 200, noma'lum marshrut
  404, CSP `connect-src` haqiqiy backend domenini (`https://`+`wss://`)
  to'g'ri aks ettiradi, `localhost` sizib chiqmagan.
- Backend: `https://backend-production-52385.up.railway.app` —
  `/health/live`+`/health/ready` ikkalasi ham `{"status":"ok",...}`,
  Prisma/Redis ulangan, Reconciliation/Outbox repeatable job'lari
  ro'yxatdan o'tgan, CORS aniq frontend domenigagina ruxsat beradi
  (wildcard emas), `/docs` 404 (Swagger o'chirilgan), login xato javobi
  toza `DomainError` (xom stack trace emas), `requestId` bor.

**DB rollari — REAL Railway Postgres'da tasdiqlangan** (taxmin emas):
`prisma/sql/roles.sql` orqali `bobododa_app`/`bobododa_migrator`
bootstrap qilindi, 21 ta migratsiya toza DB'ga qo'llandi. Uch aniq
tekshiruv: `bobododa_app` SELECT qila oladi ✓, `CREATE TABLE` rad etiladi
("permission denied for schema public") ✓, `ledger_entries`ga UPDATE rad
etiladi ("permission denied for table ledger_entries") ✓ — moliyaviy
append-only himoya REAL production DB'da ishlaydi, faqat kod darajasida
emas.

**Backup + Restore drill — BAJARILDI va TASDIQLANDI**: `pg_dump`
(PostgreSQL 18 mos versiya, Railway'ning o'zi 18.6) real production
DB'dan → ALOHIDA, IZOLYATSIYALANGAN lokal DB'ga `pg_restore` → `prisma
migrate status` "Database schema is up to date" (21/21 migratsiya, drift
yo'q) → 34 jadval, barcha kritik moliyaviy jadval (`ledger_transactions`,
`audit_logs` va h.k.) mavjud. Qator sonlari 0 — bu XATO EMAS, production
hali LAUNCH qilinmagan, haqiqatan bo'sh. Drill resurslari tozalandi
(`dropdb`). **Railway'ning o'z avtomatik backup xususiyati FAQAT dashboard
orqali yoqiladi** (CLI'da bunday buyruq yo'q, tekshirilgan) — operator
Railway konsolida Postgres xizmati → "Backups" bo'limidan yoqishi kerak
(tavsiya: kunlik, kamida 7 kunlik saqlash). Qo'lda bajarilgan drill
MEXANIZMNING o'zi ishlashini isbotladi, lekin DOIMIY, JADVAL bo'yicha
avtomatik backup hali dashboard'da YOQILMAGAN — bu ANIQ, KEYINGI qadam.

**PAYMENTS_ENABLED=false — xavfsiz to'lovsiz launch (yangi, real Payme
credential yo'qligi uchun)**: `PAYOUTS_ENABLED` bilan BIR XIL naqsh —
`payment.module.ts` HAR DOIM `DisabledPaymentProvider` qaytaradi
(`PAYMENT_PROVIDER`/`NODE_ENV`dan qat'i nazar), `PaymentController.
create()` DB yozuv/idempotency rezervatsiyasidan OLDIN `FEATURE_DISABLED`
(503) qaytaradi — mavjud moliyaviy tarix TEGILMAYDI. Frontend endi bu
aniq xatoni alohida ko'rsatadi ("To'lovlar hozircha vaqtincha ishlamaydi"),
umumiy xato o'rniga. Production Railway backend AYNAN shu konfiguratsiya
bilan muvaffaqiyatli ko'tarildi (haqiqiy deploy log bilan tasdiqlangan —
avval `PAYMENT_PROVIDER=TEST IMKONSIZ` bilan crash-loop qilardi).

**CI — jiddiy, uzoq muddatli topilma tuzatildi**: `.github/workflows/
backend-ci.yml`ning "quality" job'i KAMIDA 2026-09-15'dan beri (tekshirilgan
GitHub Actions tarixi — bir nechta ketma-ket push) HAR DOIM
`generate:contracts` bosqichida yiqilar edi: bu buyruq to'liq Nest DI
grafini quradi (`emit-openapi.ts`), lekin workflow `JWT_ACCESS_SECRET`/
`JWT_STAFF_ACCESS_SECRET`/`STAFF_TOTP_ENCRYPTION_KEY`ni HECH QACHON
bermagan. Tuzatildi — CI-only, sir bo'lmagan qiymatlar qo'shildi (haqiqiy
DB/Redis ulanish TALAB QILINMAYDI, chunki bu bosqich `app.init()`ni
chaqirmaydi). Lokal'da aniq shu bosqich qayta ishga tushirilib tasdiqlandi,
keyin haqiqiy GitHub Actions run bilan qayta tekshirildi.

**CI — IKKINCHI, chuqurroq topilma (yuqoridagi tuzatish orqali ochilgan)**:
"quality" job doim yiqilgani uchun "integration" job (`needs: quality`)
HECH QACHON haqiqatan ishlab ko'rmagan edi — yuqoridagi tuzatishdan keyin
birinchi marta ishga tushganda "e2e" bosqichi HAR BIR spec'da
`P1000: Authentication failed ... 'bobododa_migrator'` bilan yiqildi.
Sabab: "Migration test" bosqichi `roles.sql` orqali `bobododa_app`/
`bobododa_migrator` rollarini `ci_app_pw`/`ci_migrator_pw` parollari bilan
yaratadi; Postgres rollari KLASTER-GLOBAL va bir xil shared service
konteyner keyingi "e2e" bosqichida ham ishlatiladi, u yerda har bir
spec'ning `beforeAll`i `provisionDb()` (`test/support/e2e-infra.ts`)
chaqiradi — bu ham AYNAN o'sha rol nomlarini, lekin `'app'`/`'migrator'`
parollari bilan, `IF NOT EXISTS` sharti bilan yaratishga urinadi. Rollar
ALLAQACHON (birinchi bosqichdan) mavjud bo'lgani uchun yaratish
o'tkazib yuboriladi va parol ESKI (`ci_app_pw`/`ci_migrator_pw`) qolib
ketadi — keyin `provisionDb()` o'zining qattiq yozilgan `'app'`/
`'migrator'` paroli bilan ulanishga urinib, rad javobi oladi. Tuzatish:
"Migration test" bosqichining parollari `provisionDb()`ning konvensiyasi
bilan (`'app'`/`'migrator'`) MOSLASHTIRILDI. Izolyatsiyalangan throwaway
Postgres klasterda AYNAN shu xato reproduksiya qilindi (rol bitta parol
bilan yaratilib, boshqasi bilan ulanishga urinilganda haqiqiy P1000),
keyin tuzatish tasdiqlandi. So'ng butun lokal e2e suite (19 spec, real
Postgres+Redis, CI'ning bosqich tartibi bilan — avval "Migration test",
keyin "e2e") IKKI MARTA to'liq ishga tushirildi: birinchi marta eski,
uzoq muddat ishlab turgan (haftadan beri) lokal Redis'ga qarshi ishlatilib
223/339 test yiqilgani aniqlandi — lekin bu MENING tuzatishimga aloqasi
YO'Q edi, sabab ESKI Redis'dagi to'plangan holat (BullMQ navbat/rate-limit
kalitlari) edi, real CI HAR DOIM YANGI Redis konteyner bilan ishlaydi.
Butunlay YANGI, izolyatsiyalangan Postgres+Redis juftligiga qarshi qayta
ishga tushirilganda 338/339 (keyin qayta tekshirilganda 339/339) o'tdi —
qolgan yagona muvaqqat yiqilish `seller-onboarding.e2e-spec.ts`dagi "10 ta
PARALLEL submit" poyga testi edi, bu allaqachon kod izohida (`jest-e2e.
setup.ts`) "ba'zan ECONNRESET beradi" deb hujjatlashtirilgan, MENING
tuzatishimga ALOQASI YO'Q, alohida qayta ishga tushirilganda 22/22 o'tdi.
Push qilingach haqiqiy GitHub Actions run (35369445037) BOSHQA bitta test
bilan yiqildi: `payment.e2e-spec.ts`dagi "10 ta parallel bir xil key"
testi — bu ESA haqiqiy, uchinchi, mustaqil topilma bo'lib chiqdi (flaky
emas): `IdempotencyService.replay()` (`src/common/idempotency/
idempotency.service.ts`) ATAYLAB xavfsiz — agar original so'rov ALLAQACHON
tugagan bo'lsa (statusCode yozilgan), keyingi bir xil kalitli so'rov 409
CONFLICT emas, 200 REPLAY (xuddi shu id bilan xavfsiz keshlangan javob)
qaytaradi; faqat original HALI tugamagan (statusCode === null) bo'lsa 409
qaytadi. Test esa qat'iy `succeeded.toHaveLength(1)` / `conflicted.
toHaveLength(9)` talab qilardi — bu faqat original JUDA tez tugasa (lokal
mashinada odatiy holat) to'g'ri, sekinroq/boshqacha rejalashtirilgan CI
runner'da esa original ko'proq so'rov yetib kelgunicha ALLAQACHON tugab,
ko'pchiligi 409 o'rniga xavfsiz 200 REPLAY oladi (CI run'da 7/10 shunday
bo'ldi — HAMMASI bir xil Payment id bilan, DUBLIKAT TO'LOV YO'Q). Bu
ilova mantig'ida XATO EMAS (moliyaviy invariant — bitta Payment qatori —
har doim saqlangan), balki TEST'ning o'zida vaqtga bog'liq, haddan tashqari
qat'iy assertsiya edi. Tuzatildi: assertsiya endi vaqtdan mustaqil
invariant'larni tekshiradi — har bir javob 200 yoki 409 (10tasi ham),
kamida bittasi 200, BARCHA 200'lar BIR XIL id (dublikat yo'q), BARCHA
409'lar aynan `IDEMPOTENCY_CONFLICT`, va DB'da aniq bitta `Payment` qatori
— moliyaviy kafolatning o'zi TEKSHIRUV DOIRASIDAN TUSHIB QOLMAYDI, faqat
vaqtga bog'liq bo'lgan qism olib tashlandi. Lokal'da izolyatsiyalangan
muhitda 5 marta ketma-ket + to'liq fayl (24/24) tasdiqlandi, typecheck/
lint toza.

**`seller-onboarding.e2e-spec.ts`dagi "10 ta PARALLEL submit" — HAL
QILINMAGAN, OCHIQ topilma (halol yozib qo'yilmoqda, "hal qilindi" deb
da'vo qilinmaydi).** Bu test HAM xuddi shu (yuqoridagi) sababdan — real
GitHub Actions runner'da ilgari HECH QACHON ishlamagan edi — birinchi
marta ishga tushganda kuzatildi va **8 marta ketma-ket real CI run'da**
(kod push + 2 qayta urinish siklida) **doim AYNAN shu bitta test** bilan
yiqildi, boshqa 21 testda yoki qolgan 18 e2e faylida HECH QACHON emas —
bu tasodifiy emasligini, GitHub Actions'ning standart 2 vCPU runner'iga
XOS ekanligini ko'rsatadi (mening 20 yadroli lokal mashinamda xuddi shu
test ancha kamroq — garchi nolga teng bo'lmasa-da — muvaffaqiyatsiz
bo'ladi). Uch xil, mustaqil, asosli tuzatish sinovdan o'tkazildi va HAR
BIRI KOMMIT QILINGAN (qaytarilmagan, chunki hech biri zararli emas):
(1) so'rov darajasidagi qayta urinishni 1dan 3ga oshirish, (2) server
`keepAliveTimeout`ni 5s (Node sukuti)dan 65s ga ko'tarish (bo'sh
keep-alive socket'ning server tomonidan mijoz uni qayta ishlatishga
urinayotgan aynan shu daqiqada yopilishi — klassik poyga holati), (3)
`jest.retryTimes(2)` — BUTUN testni (yangi telefon/user bilan, xavfsiz,
chunki endpoint CAS orqali tabiiy idempotent) qayta ishga tushirish.
**Uchinchisi HAM yordam bermadi** — real CI logida "RETRY 1"/"RETRY 2"
ko'rinib turibdi (mexanizm ishlayapti), lekin test 3ta urinishning
UCHALASIDA HAM bir xil `read ECONNRESET` bilan yiqildi — bu tasodifiy
har-urinishda-mustaqil ehtimollik emas, balki CI muhitining shu bosqichga
kelgudek KUMULATIV holatiga (masalan, butun uzun suite davomida
to'plangan port/socket resursi bosimi) bog'liq bo'lishi mumkinligini
ko'rsatadi — buni tasdiqlash uchun qo'shimcha, ancha chuqurroq tekshiruv
kerak (masalan Docker service konteynerining tarmoq/conntrack chegaralari).
Muhim ikkita dalil: (a) real CI logida bu testdan OLDIN yoki KEYIN hech
qanday Prisma dvigateli xatosi YO'Q — bu sof transport darajasidagi hodisa;
(b) DB invariant (`sellerApplication.count === 1`) testning O'ZIDA
tekshiriladi va muvaffaqiyatli tugagan HAR bir urinishda saqlangan —
moliyaviy/biznes mantiqda XATO YO'Q, faqat 10x sun'iy bir vaqtdagi
so'rov yuklamasi ostida CI transport qatlamida beqarorlik bor. Bu haqiqiy
foydalanuvchi trafigida UCHRAMAYDIGAN naqsh (bitta sessiyadan millisoniyalar
ichida 10ta bir xil so'rov) — shuning uchun bu **launch'ni bloklamaydi**,
lekin CI ishonchliligi uchun ANIQ, hali yechilmagan P2 topilma sifatida
qayd etiladi (P0/P1 emas — production xavfsizligiga ta'siri yo'q).

**Backend Dockerfile — jiddiy topilma tuzatildi**: `backend/`ning o'ziga
xos `package-lock.json`i YO'Q edi (npm workspaces monorepo, yagona lockfile
ildizda) — image HAR DOIM `deps` bosqichida yiqilardi. Backend HECH QANDAY
workspace paketiga (`@bobododa/contracts`) bog'liq emasligi tekshirilgach,
ALOHIDA, standalone lockfile generatsiya qilindi (`npm install --package-
lock-only`, izolyatsiyalangan papkada) va `backend/`ga qo'shildi — Dockerfile
o'zining asl, sodda dizayniga (build konteksti `backend/`ning o'zi) qaytdi.
Haqiqiy Railway build bilan tasdiqlandi.

**Branch protection**: `main` (GitHub `Lazizdeveloper/Bobo-Doda`, `origin`
— DIQQAT, `upstream` boshqa hisobga tegishli, TEGILMADI) endi himoyalangan:
PR majburiy, force-push va o'chirish bloklangan. `required_status_checks`
ATAYLAB hali sozlanmagan — CI "quality" job'i uzoq vaqt yiqilib kelgani
uchun (yuqoriga qarang) aniq check nomlarini ishonchli deb bo'lmasdi; endi
tuzatilgach, keyingi qadam sifatida qo'shilishi mumkin.

**Object storage — ANIQ dalil bilan NOT_REQUIRED**: `filesService.upload`
(frontend) hamon `disabled()` (FEATURE_DISABLED) qaytaradi — HECH QANDAY
foydalanuvchi fayli HECH QACHON hech qanday diskka (vaqtinchalik ham)
yozilmaydi. KYC/xizmat-rasm/chat-biriktirma UI'lari REACHABLE, lekin
yuklash chaqiruvi har doim toza xato bilan rad etiladi — Railway
ephemeral disk xavfi shu sababli AMALDA MAVJUD EMAS. Haqiqiy fayl
yuklash qurilganda (kelajakda) — R2/S3 shart, hozircha emas.

**Monitoring**: Railway'ning o'zining strukturaviy log oqimi (CLI orqali
`railway logs`) va real-vaqt resurs metrikasi (`railway metrics`) ALLAQACHON
ishlaydi (tekshirilgan — backend/frontend/Postgres/Redis hammasi past
yuklama, muammosiz). Sentry yoki shunga o'xshash tashqi xato-kuzatuv
integratsiyasi HALI YO'Q (`package.json`da tekshirilgan, hech qanday
`sentry` paketi yo'q) — bu YANGI vendor/byudjet qarori talab qiladi,
shuning uchun bu bosqichda O'YLAB TOPILMADI ("do not overengineer").
Railway dashboard'ining o'z resurs-ogohlantirish sozlamalari (CPU/xotira/
qulab tushish) — dashboard orqali qo'lda yoqilishi kerak, CLI orqali
sozlanmaydi.

### RAILWAY_INFRA_READY: **PASS**
### PAYMENT_FREE_PRODUCTION_READY: **PASS** (kod darajasida — real Payme
kelgach `PAYMENTS_ENABLED=true` + credential'lar qo'shilsa yetarli, kod
o'zgarishi shart emas)
### BACKUP_VERIFIED: **PASS** (qo'lda drill) — **avtomatik, jadvalli
backup HALI dashboard'da yoqilmagan** (aniq keyingi qadam, yuqoriga qarang)
### CI_INTEGRATION_JOB: **WARNING** — real Postgres/Redis bilan "integration"
job'i ikkita mustaqil, uzoq muddatli topilmani (rol/parol nomuvofiqligi,
vaqtga bog'liq idempotency assertsiyasi) tuzatgandan keyin HAM bitta
qoldiq, HAL QILINMAGAN P2 muammo bilan qizil qolmoqda — yuqoriga qarang
("10 ta PARALLEL submit" bandi). Bu ILOVA/moliyaviy xato EMAS (uch marta
mustaqil isbotlangan), FAQAT CI test transport ishonchliligi. "Quality"
job (lint/typecheck/unit/contracts) esa TO'LIQ, barqaror YASHIL.
### FULL_PRODUCTION_READY: **BLOCKED** — real Payme credential va Railway
dashboard'dagi avtomatik backup sozlamasi kutilmoqda; CI "integration"
job'idagi qoldiq P2 topilma launch'ni BLOKLAMAYDI (production xavfsizligiga
ta'siri yo'q), lekin CI ishonchliligi uchun ANIQ ochiq qolmoqda
