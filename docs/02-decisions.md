# 02 — Arxitektura qarorlari (ADR)

> Bosqich 0 yakunida qabul qilingan qarorlar. Har biri: **kontekst → qaror →
> oqibat**. Bu qarorlar yakuniy; kod yozayotganda qaror bilan ziddiyat
> topilsa — to'xtab so'raladi.

**Umumiy yangi qoida.** `lib/api/client.ts` va `lib/api/*.ts` adapter
qatlamini o'zgartirishga ruxsat beriladi — bu arxitekturaning o'zi ko'zda
tutgan seam. React komponentlari, sahifalar, `lib/types.ts` — tegilmaydi.

---

## ADR-01 — Pul: DB tiyin, DTO so'm, floor yaxlitlash

**Kontekst.** Prompt talabi: pul `number`/float bilan hisoblanmaydi, hamma
summa tiyinda (`BigInt`). Frontend esa butun **so'm** bilan ishlaydi va
`daromad`/`xarajatlar` ekranlarida 5% ni o'zi hisoblaydi (`sellerNet`,
`Math.round`). DTO'ni tiyinga o'tkazish har bir ekran arifmetikasini
buzardi — "frontendga tegilmaydi" qoidasiga zid.

**Qaror.**
- **DB va ledger** — `BigInt` tiyin.
- **DTO** — butun son so'm. Chegara (NestJS interceptor / frontend adapter)
  DTO⇄DB ×100 / ÷100.
- Yo'qotish nolga teng, chunki **ledger'ga faqat `amount % 100 === 0`
  yoziladi**. `LedgerService.post()` yozishdan oldin har `LedgerEntry` ni
  tekshiradi; buzilsa `InvariantViolationError` + transaction rollback.
- Har qanday hisob-kitob natijasi ledger'ga yozilishidan oldin butun so'mga
  **floor (pastga)** yaxlitlanadi; **qoldiq `PLATFORM_REVENUE`ga** ketadi
  (foydalanuvchi hech qachon zarar ko'rmaydi, yig'indi doim 0).
- API pul javoblarida **hisoblangan maydonlar**:
  `amount, feeAmount, netAmount, currency, feeRateBps`. Frontend'ning o'z
  hisobi faqat display; backend qiymati bilan farq bo'lsa keyingi kichik PR
  tuzatadi. **Backend hech qachon frontend hisobiga ishonmaydi.**
- Tiyin faqat ikki joyda ko'rinadi: gateway bilan aloqa (Payme tiyinda) va
  reconciliation. Domen mantiqi bilan aralashmaydi.

**Oqibat.**
- Frontend adapter (`client.ts`) javobdagi tiyin bo'lsa ÷100 qiladi — lekin
  API allaqachon so'm berishi kerak, adapter faqat zaxira.
- `docs/00` da frontend 5% ni o'zi hisoblaydigan joylar ro'yxati bor
  (`daromad/page.tsx`, `xarajatlar/page.tsx`) — keyin bitta PR bilan
  `feeAmount`/`netAmount` ga o'tkaziladi.
- `LedgerEntry` invariant testda ham, runtime'da ham (DB constraint yoki
  transaction guard).

---

## ADR-02 — Enum'lar: inglizcha `UPPER_SNAKE`, frontend adapterida map

**Kontekst.** Frontend state literallari o'zbekcha (`"faol"`,
`"mablaglangan"`, `"topshirildi"` …) va UI hamma joyda shularга `switch`
qiladi, `assertTransition(contractMachine, …)` chaqiradi. DB enum'ini
o'zbekcha qilib qo'yish: nom o'zgarishi migratsiya talab qiladi, admin SQL
o'qib bo'lmas holga keladi, ikkinchi frontend/mobil/hamkor o'zbekcha
literalga bog'lanadi, Sentry/Grafana/audit har xil lug'atda bo'ladi.

**Qaror.**
- DB, domen, ledger, log, Swagger/OpenAPI — hammasi **inglizcha
  `UPPER_SNAKE`**. HTTP API ham inglizcha qaytaradi.
- O'zbekchaga aylantirish **`lib/api/wire-enums.ts`** da: har state machine
  uchun `Record<BackendStatus, FrontendStatus>` — **exhaustive**, ikki
  tomonlama (so'rov yuborishda teskari map).
- Manba — OpenAPI'dan generatsiya qilingan TS tiplari
  (`backend/packages/contracts`). Backend yangi enum qiymati qo'shsa
  frontend `tsc` xato beradi — bu asosiy himoya.
- Map to'liqligini tekshiradigan test bor va u **OpenAPI'ni manba sifatida
  oladi** (qo'lda ko'chirilgan ro'yxat emas).

**Oqibat.**
- `docs/00` §7 va `docs/01` §0 da har enum uchun inglizcha↔o'zbekcha jadval.
- Frontend keyinchalik inglizchaga o'tsa — `wire-enums.ts` o'chiriladi,
  boshqa hech narsa o'zgarmaydi.
- Bosqich 1 oxirida `wire-enums.ts` qoralamasi chiqariladi, lekin frontend
  fayli yozilmaydi — u Bosqich 2 da real endpointlar paydo bo'lgach kiritiladi.

---

## ADR-03 — `fundContract`: v1 tarmoqlari va `FundResult` union

**Kontekst.** Mock `fundContract` `Promise<Contract>` qaytaradi va ikki
tarmoqli: karta/tezkor (sinxron `faol`) va b2b (kvitansiya, admin
tasdiqlaydi). Real karta to'lovi ASINXRON — foydalanuvchi gateway sahifasiga
ketadi, qaytadi, callback mustaqil keladi. `Promise<Contract>` buni ifodalay
olmaydi.

**Qaror.**
- **v1 tarmoqlari:** Payme, Click, ichki balansdan to'lash (wallet). Karta
  ekvayringni to'g'ridan-to'g'ri qilmaymiz — Payme/Click qoplaydi. Qo'lda
  bank o'tkazmasi — **v1.1** (yuridik shaxs xaridorlar uchun, admin
  tasdiqlash oqimi qo'shimcha ish).
- **Qaytish tipi o'zgaradi:**
  ```ts
  fundContract(contractId, method): Promise<FundResult>
  type FundResult =
    | { kind: 'funded';   contract: Contract }              // walletdan, sinxron
    | { kind: 'redirect'; paymentId: string; url: string }  // Payme / Click
  ```
- `fundMilestone` chegaradan **olib tashlanadi** — to'liq-oldindan model uni
  ishlatmaydi (UI ham chaqirmaydi).
- Contract to'lov tasdiqlanmaguncha **`PENDING_PAYMENT`** (frontend
  `imzolangan`). Return URL'dan qaytish uni `ACTIVE` qilmaydi — faqat
  tasdiqlangan callback yoki `getStatus` polling.
- `PaymentCallback` foydalanuvchi qaytishidan **oldin ham, keyin ham**
  kelishi mumkin. Faqat callback'ga yoki faqat return URL'ga tayanilmaydi —
  ikkalasi `PaymentIntent` holatini bir xil idempotent yo'l bilan yangilaydi,
  kim birinchi kelsa.
- Callback imzosi yaroqsiz → **401, hech narsa yozilmaydi** (fail closed).
  `NODE_ENV === 'production'` da bypass imkonsiz (env validation + runtime
  check).

**Frontend'da minimal o'zgarish (adapter + 2–3 ekran):**
1. `fundContract` chaqiruvchi joyda `kind` bo'yicha shoxlanish.
2. Yangi sahifa `/payment/return?paymentId=…` — "to'lov tekshirilmoqda",
   `GET /payments/:id` ni 2 s da bir marta, 60 s davomida, keyin "keyinroq
   tekshiring".

**Oqibat.**
- `PaymentIntent` + `PaymentCallback` alohida jadvallar (`docs/01` §5).
- `IdempotencyKey` jadvali — har pul-harakati endpoint'i uchun.
- v1'da `Contract` dagi `b2b*`/`paymentReceipt*` maydonlari YO'Q; adapter
  ularni `null` beradi.

---

## ADR-04 — `User.roles[]` + `Session.activeRole`; admin alohida `StaffMember`

**Kontekst.** Marketplace'da bir odam ham sotadi, ham sotib oladi — norma.
Frontend `UserRole = "mutaxassis" | "xaridor"` (singular) va har bir layout
guard shunga tayanadi. Singular DB — 6 oydan keyin ikkinchi akkaunt, ikki
marta KYC, bo'lingan reyting.

**Qaror.**
- DB: `User.roles Role[]` (`[SELLER]`, `[BUYER]`, yoki ikkalasi).
- Sessiya: bitta **`activeRole`** (JWT ichida). API singular ko'rinishni
  saqlaydi: `GET /me` → `{ role: activeRole, availableRoles: user.roles, … }`.
- `POST /me/roles/switch` → yangi access token, boshqa `activeRole`; refresh
  oilasi saqlanadi.
- `POST /me/roles` — ikkinchi rol qo'shish. `SELLER` bo'lish uchun KYC
  talab, `BUYER` uchun yo'q.
- **Avtorizatsiya ikki bosqichli, ikkalasi majburiy:** (1) qobiliyat —
  `user.roles.includes(SELLER)`? (2) kontekst — `session.activeRole ===
  SELLER`? Ikkinchisi shart: xaridor rejimida ochilgan sahifadan sotuvchi
  amali audit'da chalkashlik va XSS/CSRF ta'sir doirasini kengaytiradi.
- **Admin alohida.** `ADMIN` marketplace roli EMAS. `StaffMember` jadvali
  (`userId?`, `permissions[]`, `role: StaffRole`, `isActive`, `mfaEnabled`).
  Admin panel RBAC shunga tayanadi. Marketplace roli bilan aralashtirilsa,
  bitta xato guard butun platformani ochib qo'yadi.

**Oqibat.**
- Frontend layout guard'lari `role` (= `activeRole`) ni ko'rishda davom
  etadi — o'zgarmaydi. "Rol almashtirish" tugmasi kelajakda qo'shilsa
  `POST /me/roles/switch` ni chaqiradi.
- `docs/00` §4 admin surface `StaffMember` ga qayta bog'lanadi
  (`AdminAccount` → `StaffMember`, `AdminPermission` → `StaffPermission`).

---

## ADR-05 — Komissiya: runtime, versiyalangan, `Contract` da snapshot

**Kontekst.** `lib/fees.ts` `PLATFORM_FEE_PERCENT = 5` — build konstantasi,
landing/FAQ/help import qiladi. Admin sozlamasi `readOnly`. Prompt misolida
15%. Stavka o'zgarganda eski shartnomalar hisoboti buzilmasligi kerak.

**Qaror.**
- Komissiya **runtime**, `PlatformFeeConfig` jadvalidan (`feeRateBps`,
  `effectiveFrom`), versiyalangan.
- Har `Contract` yaratilganda amaldagi stavkani o'ziga **snapshot** qiladi
  (`Contract.feeRateBps`). Bosqich chiqarilganda shu snapshot ishlatiladi —
  eski shartnoma uchun joriy stavka hech qachon o'qilmaydi.
- `PlatformSetting.platform_commission_percent` — `readOnly` UI'da joriy
  qiymatni ko'rsatadi; o'zgartirish `PlatformFeeConfig` orqali
  (`SETTINGS` + `SUPER_ADMIN`).
- Yaxlitlash — **floor**, qoldiq `PLATFORM_REVENUE` (ADR-01).

**Oqibat.**
- `lib/fees.ts` frontend'da qoladi (landing va yordam matnlari uchun), lekin
  hisob-kitobda backend `feeAmount`/`netAmount` ustun. Ikki qiymat farq
  qilsa — display bag'i, keyin tuzatiladi.
- Admin dashboard `commissionTotal` — ledger `PLATFORM_REVENUE` dan
  (`platformFee(completedTotal)` emas).

---

## ADR-06 — Pagination: aralash (kursorli + offsetli)

**Kontekst.** `ApiPage<T>`/`ApiListQuery` (kursorli) aniqlangan, ishlatilmaydi.
Admin `AdminPage<T>` (offset) — operatorga "42 tadan 7-sahifa" kerak.

**Qaror.**
- **Kursorli:** xabarlar, bildirishnomalar, ledger yozuvlari, audit log —
  o'sib boradigan ro'yxatlar.
- **Offsetli:** admin navbatlari (sahifa raqami ko'rsatiladi), katalog
  (qidiruv natijalari).
- Aralash bo'lishi normal — bitta usulga majburlash shart emas.

**Oqibat.** `docs/00` §3/§4 da har ro'yxat metodi qaysi usulni ishlatishi
belgilanadi (Bosqich 3+).

---

## ADR-07 — Realtime: v1'da polling, WebSocket yo'q

**Kontekst.** `DATA_CHANGED_EVENT` — brauzer eventi. Prompt WSS istaydi (chat,
holat, push). `messagesService` da socket/typing/receipt metodlari yo'q.

**Qaror.**
- **v1: WebSocket YO'Q.** Chat uchun polling (faol oyna 3 s, fon 15 s),
  bildirishnoma uchun ham.
- Interfeys transportdan mustaqil yoziladi — v1.1 da WebSocket qo'shilsa
  service qatlami o'zgarmaydi.

**Sabab.** WebSocket sticky session, Redis adapter, reconnect mantiqini
olib keladi — v1 uchun narxi foydasidan yuqori.

**Oqibat.** `OutboxEvent` + BullMQ offline yetkazish (15 min → SMS/Telegram)
baribir kerak.

---

## ADR-08 — Wallet balans: yangi endpoint, ledger'dan

**Kontekst.** "Yechish mumkin" summa server endpoint'i YO'Q. `daromad/
page.tsx` uni client-side hisoblaydi:
`Σ sellerNet(m.amount) [qabul_qilindi] − withdrawn − pending`. Prompt: balans
hech qachon client-side qo'shilmasin.

**Qaror.**
- Yangi endpoint `GET /wallet/balance` → `{ available, pendingClearance,
  inEscrow, currency }` (butun so'm), ledger'dan hisoblanadi.
  - `available` — `USER_AVAILABLE` − band yechish so'rovlari.
  - `pendingClearance` — to'lov o'tgan, lekin ushlab turish muddati
    (`PlatformSetting.payout_hold_days`, boshlang'ich 3 kun) tugamagan.
  - `inEscrow` — escrow'dagi (buyer) yoki kutilayotgan daromad (seller).
- `daromad`/`xarajatlar` client-side hisoblashdan shu endpoint'ga o'tadi.
- Adapter `getBalance`/`getWithdrawnTotal`/`getPendingWithdrawalTotal` ni shu
  bitta javobdan yasaydi.

**Oqibat.** `docs/00` §3.12 yangilandi. Frontend ekran o'zgarishi — Bosqich 4/5.

---

## Qisqa qarorlar (ADR emas, lekin yakuniy)

| Savol | Qaror |
|---|---|
| **Ko'p valyuta** | v1 faqat `UZS`. `amount` + `currency` doim juft. Ko'p valyuta backend real FX kursini qaytarganda. |
| **Sharhlar** | Ikki tomonlama, ko'r-ko'rona, 14 kunlik oyna. Ikkalasi yozgunicha yoki oyna yopilgunicha ko'rinmaydi. |
| **i18n** | Platforma kontenti (kategoriya, ko'nikma, bildirishnoma shabloni, email) — 3 tilda. Foydalanuvchi kontenti (xizmat tavsifi, e'lon, xabar) — tarjima qilinmaydi, qaysi tilda yozilgan bo'lsa saqlanadi + `lang` maydoni. Qidiruv `lang` bo'yicha filtrlaydi. `Skill`/`Category` — alohida entity. |
| **Fayllar** | Barcha foydalanuvchi fayllari presigned S3. KYC hujjatlari **alohida bucket**: public access yopiq, presigned TTL 5 daq, har o'qish `AuditLog` ga (kim, qaysi hujjat, qachon, qaysi ariza). Server bayt proxy qilmaydi. |
| **`getAdminData()`** | Dashboard ham ko'chiriladi, eski metod o'chiriladi. Ikkita parallel yo'l qoldirilmaydi. |
| **GAP xato kodlari** | Backend manba. 7 ta kod backend taksonomiyasiga, OpenAPI'ga chiqariladi, frontend `errors.ts` shundan generatsiya (qo'lda ikki joyda emas). |
| **Nizo / apellyatsiya** | Nizo — v1 (state machine #5). Foydalanuvchi apellyatsiyasi — v1.1; v1'da admin qarori yakuniy, lekin `Dispute` da `appealable` + `resolvedAt` hozirdan. |
| **`Job.status`** | Bosqich 3'da to'liq javob (2-qiymatli yoki boyroq). Bosqich 1 ni bloklamaydi. |
| **`register` semantikasi** | Bosqich 2 boshida (darhol `Session` yoki `register`→OTP→`verify`). Modellar ikkalasini qo'llaydi. |

---

## Keyingi qadamlar

1. ✅ `docs/00` va `docs/01` shu qarorlar bo'yicha yangilandi.
2. ✅ Shu hujjat (`docs/02-decisions.md`).
3. ✅ **Bosqich 1** — `backend/` da NestJS skeleton + Prisma schema
   (`20260909232121_init`) + config (Zod) + global pipe/filter/interceptor +
   requestId + health + Swagger (OpenAPI 3.1) + Docker Compose
   (postgres/redis/minio) + CI (`.github/workflows/backend-ci.yml`).
   Tekshirildi: typecheck / lint / 28 unit test / build ✅; real Postgres 16 +
   Redis bilan app boot + `/health/ready` 200 + `/docs` ✅; migration 0-drift ✅.
   `docker compose up` va Testcontainers `test:e2e` — CI da (bu sandbox'da
   Docker daemon yo'q).
4. ✅ `docs/wire-enums-draft.md` — `lib/api/wire-enums.ts` qoralamasi
   (frontend fayli YOZILMADI — Bosqich 2 da real endpointlar + OpenAPI bilan).

**Keyingi: Bosqich 2 — Auth va foydalanuvchilar.**
