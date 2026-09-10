# 01 — Data Model (Prisma schema qoralamasi)

> **Bosqich 0 natijasi — KOD EMAS, tavsif.** Frontend (`lib/types.ts` +
> `lib/admin-types.ts`) kutayotgan shakldan kelib chiqib PostgreSQL 16 /
> Prisma 6 modelini taklif qiladi. Qarorlar `docs/02-decisions.md` da (ADR).
>
> **Umumiy qoidalar:**
> - Pul: DB + ledger — `BigInt` **tiyin**. DTO — butun **so'm**. Chegara
>   (`lib/api/client.ts` adapter yoki NestJS interceptor) ×100 / ÷100.
>   Ledger'ga faqat `amount % 100 === 0` yoziladi — yo'qotish nolga teng
>   (**ADR-01**).
> - `amount` + `currency` doim juft. v1 faqat `UZS`.
> - Enum'lar **inglizcha `UPPER_SNAKE`** — DB, domen, ledger, log, OpenAPI
>   (**ADR-02**). O'zbekchaga o'girish frontend adapterida (`wire-enums.ts`).
> - `version Int @default(0)` — holatga ta'sir qiladigan har modelda
>   (optimistic lock).
> - Vaqt: `DateTime @db.Timestamptz(6)`.
> - Soft-delete kerak bo'lsa `deletedAt DateTime?`.
> - `LedgerEntry` append-only: UPDATE/DELETE yo'q, xato → reversal.
> - Balans hech qachon ustun emas — ledger'dan hisoblanadi
>   (materialized view / cache faqat o'qish uchun, ledger'dan qayta tiklanadi).
> - Migratsiya faqat `prisma migrate` — qo'lda SQL yoki `db push` yo'q.
> - Modul chegarasi: bir modul boshqasining Prisma modeliga tegmaydi, faqat
>   service orqali.

---

## 0. Enum'lar (inglizcha wire qiymatlari)

> Frontend `lib/api/wire-enums.ts` da har biri uchun exhaustive
> `Record<Backend, Frontend>` bo'ladi. O'zbekcha ekvivalent — `state-machines.ts`.

```
Role                 SELLER | BUYER                    (User.roles: Role[])
TrustBadge           NEW | TRUSTED | TOP_RATED
LanguageLevel        NATIVE | FLUENT | INTERMEDIATE | BASIC
ServiceStatus        ACTIVE | PAUSED | DRAFT
ServiceStatus (admin bozor moderatsiyasi ham shu enum)

JobStatus            OPEN | CLOSED
                     (Q46 — Bosqich 3: DRAFT/IN_PROGRESS/CANCELLED/EXPIRED qo'shilishi mumkin)

ProposalStatus       SENT | VIEWED | SHORTLISTED | HIRED | REJECTED | WITHDRAWN
   ↔ o'zbekcha        yuborilgan | korib_chiqilmoqda | suhbat | yollandi | rad_etildi | qaytarib_olingan

OfferStatus          SENT | ACCEPTED | DECLINED | WITHDRAWN
   ↔                  yuborilgan | qabul_qilindi | rad_etildi | bekor_qilingan

ContractStatus       SIGNED | ACTIVE | COMPLETED | CANCELLED | DISPUTED
   ↔                  imzolangan | faol | yakunlangan | bekor_qilingan | nizo

ContractSourceType   SERVICE | JOB | DIRECT_OFFER
   ↔                  xizmat | taklif | taklifnoma

ContractPaymentStatus  AWAITING_PAYMENT | RECEIPT_UPLOADED | PENDING_VERIFICATION
                       | CONFIRMED | REJECTED | REFUND_PENDING | REFUNDED
   ↔ awaiting_payment | receipt_uploaded | pending_verification | payment_confirmed
     | payment_rejected | refund_pending | refunded

MilestoneStatus      PENDING | FUNDED | SUBMITTED | ACCEPTED | REVISION_REQUESTED
   ↔                  kutilmoqda | mablaglangan | topshirildi | qabul_qilindi | ozgartirish_soraldi
   (prompt SM'da IN_PROGRESS va RELEASED ham bor — Bosqich 4: FUNDED=IN_PROGRESS,
    ACCEPTED→RELEASED ledger harakati bilan; frontend faqat 5 tasini biladi)

PaymentMethod        PAYME | CLICK | WALLET               (v1 amaldagilar)
                     (karta/rossiya_karta/kaspi_kz/intl/b2b — v1.1, hozir FEATURE_DISABLED)

PaymentStatus        INITIATED | PENDING | AUTHORIZED | PAID | FAILED
                     | REFUNDED | PARTIALLY_REFUNDED
   ↔ state-machines.ts: created | pending | authorized | captured | failed | refunded | cancelled

CardType             VISA | MASTERCARD | UZCARD | HUMO | MIR

WithdrawalStatus     PENDING | UNDER_REVIEW | APPROVED | REJECTED
   ↔                  kutilmoqda | korib_chiqilmoqda | tasdiqlangan | rad_etilgan
PayoutStatus         PENDING | PROCESSING | SENT | CONFIRMED | FAILED
   ↔ payout_pending | payout_processing | paid | payout_failed
   (prompt Payout SM: REQUESTED→APPROVED→PROCESSING→SENT→CONFIRMED — WithdrawalStatus
    + PayoutStatus birgalikda qamrab oladi)
WithdrawalSource     EARNINGS | BALANCE
PayoutDestType       CARD | BANK_ACCOUNT

NotificationKind     JOB | PROPOSAL | MILESTONE | MESSAGE | PAYMENT | SYSTEM
   ↔                  elon | taklif | bosqich | xabar | tolov | tizim

DisputeReason        SCOPE | QUALITY | DEADLINE | PAYMENT | COMMUNICATION | OTHER
DisputeStatus        OPEN | UNDER_REVIEW | RESOLVED
   ↔                  ochiq | korib_chiqilmoqda | hal_qilindi
DisputeOutcome       REFUND_BUYER | PAYOUT_SELLER | SPLIT              (arbitraj natijasi)

VerificationStatus   NOT_STARTED | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | EXPIRED
   ↔                  boshlanmagan | (korib_chiqilmoqda) | korib_chiqilmoqda | tasdiqlangan | rad_etilgan | —
   (mock'da SUBMITTED va UNDER_REVIEW bitta "korib_chiqilmoqda"; EXPIRED — Q44, v1.1)
VerificationCountry  UZ | RU | KZ | KG | TJ | TR | AE | US | GLOBAL | <string>
VerificationDocType  PASSPORT | ID_CARD | INTERNAL_PASSPORT | DRIVER_LICENSE | <string>

SupportTopic         PAYMENT | CONTRACT | DISPUTE | ACCOUNT | TECHNICAL | OTHER
   ↔                  tolov | shartnoma | nizo | hisob | texnik | boshqa
SupportTicketStatus  OPEN | ANSWERED | CLOSED
   ↔                  ochiq | javob_berildi | yopilgan
SupportRequestCategory  PAYMENT_ESCROW | PROJECT | SPECIALIST | PROFILE
                        | VERIFICATION | TECHNICAL | ACCOUNT | OTHER

ReviewDirection      BUYER_TO_SELLER | SELLER_TO_BUYER
ReviewStatus         PENDING | PUBLISHED | HIDDEN

--- Ledger ---
LedgerAccountType    USER_AVAILABLE | USER_ESCROW | PLATFORM_REVENUE | PLATFORM_ESCROW
                     | GATEWAY_CLEARING | PAYOUT_PENDING
TransactionKind      DEPOSIT | ESCROW_FUND | MILESTONE_RELEASE | COMMISSION
                     | REFUND | PAYOUT | REVERSAL | ADJUSTMENT
   ↔ admin "Tranzaksiyalar": deposit | escrow_mablaglash | milestone_tolov | commission | refund | yechish

--- Staff / admin ---
StaffPermission      DASHBOARD | USERS | SERVICES | JOBS | ORDERS | KYC | DISPUTES
                     | PAYMENTS | REPORTS | APPEALS | REVIEWS | SUPPORT | CATEGORIES
                     | SETTINGS | AUDIT | STAFF
   ↔ dashboard | users | services | jobs | orders | kyc | disputes | payments
     | reports | appeals | reviews | support | categories | settings | audit | admins
StaffRole            SUPER_ADMIN | OPERATIONS | FINANCE | SUPPORT | TRUST_SAFETY | KYC_REVIEWER | ADMIN
AuditActorType       USER | STAFF | SYSTEM
UserModerationStatus ACTIVE | SUSPENDED | BLOCKED | DEACTIVATED | DELETED
TrustReportReason    SCAM | SPAM | PLAGIARISM | OFF_PLATFORM | INAPPROPRIATE | FAKE_PROFILE | COPYRIGHT
TrustReportSeverity  LOW | MEDIUM | HIGH | CRITICAL
TrustReportStatus    NEW | INVESTIGATING | RESOLVED | DISMISSED
TrustReportAction    NONE | WARNED | RESTRICTED | SUSPENDED | REMOVED
UserAppealStatus     PENDING | REVIEWING | ACCEPTED | REJECTED
FeedbackType         BUG | SUGGESTION
FeedbackStatus       NEW | SEEN | RESOLVED | DISMISSED
```

`ServiceCategory` — **enum EMAS**, `Category` jadvali (quyida §2). Frontend
hozir compile-time union; adapter kategoriya slug'ini o'zi biladi.

---

## 1. Identity

### User  (**ADR-04**)

Manba: `lib/types.ts` `User` + admin `AdminUserRow` (`moderationStatus`,
`kycStatus` — JOIN'dan keladi, ustun emas).

| Maydon | Tip | Izoh |
|---|---|---|
| id | String @id @default(uuid()) | |
| phone | String @unique | E.164; `PHONE_EXISTS` |
| passwordHash | String | **hech qachon DTO'ga chiqmaydi** (Argon2id) |
| fullName | String | ≤100 |
| **roles** | Role[] | `[BUYER]`, `[SELLER]`, yoki ikkalasi. Seller qo'shish → KYC talab; buyer qo'shish → yo'q |
| avatarKey | String? | S3 obyekt kaliti (mock hech qachon set qilmaydi) |
| onboarding | Json / alohida maydonlar | `roleChosen`, `profileDone`, `verified` — login'da sessiya tiklash uchun |
| companyName / industry / website / location / bio / email | String? | buyer/kompaniya maydonlari |
| telegramUsername / telegramLinkedAt / googleLinkedAt | | OAuth bog'lanish |
| createdAt | DateTime | |
| version | Int | |

Munosabatlar: `sellerProfile? buyerProfile?`, `services[]`, `jobs[]`,
`proposals[]`, `offersAsBuyer[]`/`offersAsSeller[]`,
`contractsAsBuyer[]`/`contractsAsSeller[]`, `messages[]`, `notifications[]`,
`reviewsAuthored[]`/`reviewsReceived[]`, `verification? Verification`,
`cards[]`, `withdrawalRequests[]`, `ledgerAccounts[]`, `refreshTokens[]`,
`supportTickets[]`, `disputesOpened[]`, `savedItems[]`,
`preferences? AccountPreferences`, `moderation? UserModeration`,
`appeals[] UserAppeal`.

Indekslar: `@@index([createdAt])`. `roles` bo'yicha filtr — GIN
(`@@index([roles], type: Gin)`).

### SellerProfile

Manba: `SellerProfile`. **Denormallashtirilgan hisoblagichlar** — §6.

| Maydon | Tip |
|---|---|
| userId | String @id @relation |
| headline / bio / location | String |
| skills | Skill[] (M:N — `@relation` yoki `SellerSkill` join; §2) |
| categories | Category[] (M:N) |
| languages | `SellerLanguage[]` (name, level: LanguageLevel) |
| portfolio | `PortfolioItem[]` (id, title, description, imageKey, categoryId?) |
| responseTimeHours | Int? — Q31 (Bosqich 6: xabar vaqtlaridan hisoblash) |
| **rating** | Decimal(2,1) — denorm |
| **reviewCount** | Int — denorm |
| **completedContracts** | Int — denorm |
| **badge** | TrustBadge — denorm (`computeBadge`) |
| memberSince | DateTime |
| available | Boolean |
| availableUntil | DateTime? |
| version | Int |

**Hisoblanadigan (saqlanmaydi):** `identityVerified` (=
`verification.status === APPROVED`), `completionRate`
(`COMPLETED / (COMPLETED + CANCELLED)`, ikkalasi 0 → `null`).

### BuyerProfile

Frontend'da alohida tip yo'q — xaridor ma'lumoti `User` da; `Job.buyerRating`
denorm (statik). **Bosqich 3'da hal:** alohida `BuyerProfile` (rating,
completedContracts, memberSince) yoki `User` da qoladimi. Hozir modelda
`buyerProfile?` optional relation qoldiriladi.

### RefreshToken  (Bosqich 2'da to'liq)

`id, userId, tokenHash, familyId, replacedById?, revokedAt?, userAgent?, ip?,
expiresAt, createdAt`. **Oilaviy reuse detection:** ishlatilgan token qayta
kelsa butun `familyId` bekor qilinadi.

- Access token: JWT 15 min, stateless. `activeRole` claim ichida.
- `Session` snapshot (`{ userId, role: activeRole, availableRoles, profileDone,
  verified }`) — bu `/auth/*` javob tanasi, ORM modeli EMAS. httpOnly cookie +
  JS o'qiy oladigan nusxa (`getSession()` uchun).
- `POST /me/roles/switch` → yangi access token, boshqa `activeRole`; refresh
  oilasi saqlanadi.

### StaffMember  (**ADR-04** — marketplace User EMAS)

| Maydon | Tip |
|---|---|
| id | String @id |
| userId | String? @unique — ixtiyoriy: staff ham marketplace foydalanuvchisi bo'lishi mumkin, lekin identity ALOHIDA |
| fullName / email | String @unique |
| passwordHash | String (Argon2id) |
| role | StaffRole |
| title | String |
| permissions | StaffPermission[] |
| isActive | Boolean |
| mfaEnabled | Boolean @default(false) |
| lastLoginAt | DateTime? |
| createdAt | DateTime |

`StaffSession` (adminId → staffMemberId, role, expiresAt — 8 soat) yoki
alohida JWT audience. `expectedRole` (`/admin/kirish` vs `/rahbariyat/kirish`)
— login'da tekshiriladi.

> **Avtorizatsiya har doim ikki bosqichli:** (1) qobiliyat —
> `user.roles.includes(SELLER)`? (2) kontekst — `session.activeRole === SELLER`?
> Ikkalasi ham majburiy. Staff uchun: (1) `permissions.includes(X)`?
> (2) super-admin marshruti bo'lsa `role === SUPER_ADMIN`?

---

## 2. Katalog

### Category / Subcategory

Hozir: `ServiceCategory` — compile-time 8-qiymatli union; admin
`CategoryManagementItem` (slug, nameUz/Ru/En, icon, order, active,
serviceCount [hisoblanadi], subcategories[]).

**Category** (id, slug @unique, nameUz, nameRu, nameEn, icon, order, active,
createdAt). **Subcategory** (id, categoryId, slug, nameUz/Ru/En, active).
`serviceCount` — runtime `COUNT`, ustun emas. Kill-switch: `active === false`
→ yangi `Service`/`Job` yaratib bo'lmaydi (`CATEGORY_DISABLED`), mavjudlari
qoladi. **Platforma taksonomiyasi 3 tilda** (ADR: i18n).

### Skill  (ADR: controlled entity)

`id, slug @unique, nameUz, nameRu, nameEn, categoryId?, approved: Boolean`.
`SellerProfile.skills` va `Job.skillsRequired` — M:N join'lar
(`SellerSkill`, `JobSkill`). Foydalanuvchi yangi ko'nikma yozsa → `approved:
false`, moderatsiya navbatiga. Frontend hozir `String[]` yuboradi — adapter
slug'ga map qiladi / yangi yaratadi.

### Service (gig — A yo'l)

Manba: `Service` + `extras`.

| Maydon | Tip |
|---|---|
| id / sellerId | String |
| categoryId | String @relation |
| title / description | String (**tarjima qilinmaydi** + `lang String`) |
| fields | Json (`Record<string, string \| string[]>` — `category-fields.ts`) |
| price | BigInt (tiyin) |
| currency | String @default("UZS") |
| deliveryDays | Int |
| images | `ServiceMedia[]` (S3 kalitlar, tartib) |
| status | ServiceStatus |
| revisionsIncluded | Int? |
| included / requirements | String[]? |
| extras | `ServiceExtra[]` (label, price BigInt) |
| createdAt / version | |

Indekslar: `@@index([sellerId])`, `@@index([categoryId, status])`,
FTS `title/description` + `pg_trgm` (kursorli emas — offset/katalog).

### ServicePackage — Q22, Bosqich 3

Frontend'da YO'Q (bitta narx/muddat). Kerak bo'lsa `Service` DTO kengayadi —
hozir loyihalashda `packages ServicePackage[]?` optional relation qoldiriladi.

---

## 3. Bozor (B yo'l + shartnoma)

### Job

Manba: `Job`. Denorm: `buyerName`, `buyerRating`, `proposalsCount`.

| Maydon | Tip |
|---|---|
| id / buyerId | String |
| title / description | String (+ `lang`) |
| categoryId | String |
| budgetMin / budgetMax | BigInt |
| currency | String @default("UZS") |
| skills | Skill[] (M:N `JobSkill`) |
| screeningQuestions | String[] (≤3) |
| deadline | DateTime? |
| attachedImages | String[] (S3 kalitlar) |
| status | JobStatus |
| postedAt / version | |
| proposalsCount | Int — denorm |

Indekslar: `@@index([buyerId])`, `@@index([status, categoryId])`,
`@@index([postedAt])`.

### Proposal

Manba: `Proposal`.

| Maydon | Tip |
|---|---|
| id / jobId / sellerId | String |
| bidAmount | BigInt |
| coverLetter | String |
| screeningAnswers | Json (`{question, answer}[]`) |
| attachedImages | String[] |
| estimatedDeliveryDays | Int? |
| status | ProposalStatus |
| createdAt / version | |

Bir ishga bir seller — bitta **faol** taklif: partial unique index yoki
app-level (`WITHDRAWN`/`REJECTED` dan keyin qayta yuborish mumkin).
Indekslar: `@@index([jobId, status])`, `@@index([sellerId])`.

### Contract

Manba: `Contract` — ENG murakkab. **ADR-05:** `feeRateBps` snapshot.

| Maydon | Tip | Izoh |
|---|---|---|
| id | String | |
| sourceType | ContractSourceType | SERVICE / JOB / DIRECT_OFFER |
| serviceId? / jobId? / offerId? | String? | manbaga havola |
| buyerId / sellerId | String | |
| buyerName / sellerName | String | denorm (o'chirilgan user uchun "O'chirilgan foydalanuvchi") |
| title | String | |
| totalAmount | BigInt | = Σ milestone.amount; arbitraj `SPLIT` da kamayadi |
| currency | String @default("UZS") | |
| **feeRateBps** | Int | yaratilganda `PlatformSetting` dan **snapshot** — bosqich chiqarilganda shu ishlatiladi |
| status | ContractStatus | |
| paymentStatus | ContractPaymentStatus? | **`PaymentIntent` aggregate'dan derived** (ustun sifatida cache — §5) |
| paymentMethod | PaymentMethod? | |
| fundedAt / escrowReference / paymentReference | | |
| contractNumber | String? | `BD-2026-0010` |
| closeRequested / closeRequestNote / closeRequestedAt | | seller "yopish" so'rovi |
| signature | `ContractSignature[]` (party: BUYER\|SELLER, name, phone, signedAt) | e-imzo — Q15: audit artefakti, holatni gate qilmaydi |
| cancelReason | String? | |
| revisionsIncluded | Int? | |
| createdAt / version | | |

> **b2b/manual-transfer maydonlari (`b2bReceiptUrl`, `paymentReceiptUrl`,
> `paymentVerifiedBy` …)** — v1'da qo'lda bank o'tkazma YO'Q (ADR-03), shuning
> uchun bu maydonlar `Contract` da EMAS. v1.1'da alohida
> `ManualBankTransfer` jadvali: `contractId, receiptKey, amount, submittedAt,
> verifiedBy?, verifiedAt?, rejectReason?, notes`. Frontend adapter bularni
> hozircha `null`/`undefined` beradi.

Indekslar: `@@index([buyerId, status])`, `@@index([sellerId, status])`,
`@@index([status])`.

### Milestone

Manba: `Milestone`.

| Maydon | Tip |
|---|---|
| id / contractId | String |
| title / description | String |
| amount | BigInt |
| status | MilestoneStatus |
| dueDate | DateTime |
| submittedAt / reviewDeadline / approvedAt | DateTime? |
| revisionCount | Int @default(0) |
| revisionsIncluded | Int? (sukut 3; xizmat/shartnomadan meros) |
| deliverables | `Delivery[]` (§4) |
| revisionRequests | `RevisionRequest[]` (§4) |
| version | Int |

`reviewDeadline = submittedAt + PlatformSetting.escrowAutoReleaseDays` (sukut 3).
Indekslar: `@@index([contractId])`,
`@@index([status, reviewDeadline])` — avto-qabul BullMQ job uchun.

### Delivery / RevisionRequest  (Q17 — ADR: alohida jadval)

Bosqich tarixi alohida saqlanadi (audit).
- **Delivery** (id, milestoneId, submittedBy, link?, note?, attachments
  `Attachment[]`, createdAt).
- **RevisionRequest** (id, milestoneId, requestedBy, comment, createdAt).

`Milestone.deliverableLink/Note/Files` (frontend inline) — adapter oxirgi
`Delivery` dan yasaydi.

---

## 4. Aloqa

### Conversation  (polimorf)

Frontend'da alohida tip yo'q — `Message.contractId` = `contractId` YOKI
`offerId` YOKI `proposalId`.

**Conversation** (id, kind: `CONTRACT | OFFER | PROPOSAL`, contractId?,
offerId?, proposalId?, buyerId, sellerId, lastMessageAt, createdAt).
`@@unique([kind, contractId])` va h.k.
**ConversationRead** (conversationId, userId, lastReadAt) —
`messagesService.getReadStatus()` ni to'g'ridan-to'g'ri qoplaydi.

### Message

Manba: `Message`.

| Maydon | Tip |
|---|---|
| id | String |
| conversationId | String (frontend'da `contractId` deb ataladi) |
| senderId | String |
| text | String |
| attachments | `Attachment[]` (rasm + fayl birlashgan; `image`/`images` — legacy, adapter birinchi rasmni beradi) |
| createdAt | DateTime |

Server-side `checkCircumvention(text)` `sendMessage` da (§7). Kursorli
pagination. Indekslar: `@@index([conversationId, createdAt])`.

### Attachment  (yagona fayl modeli — ADR: presigned S3)

`DeliverableFile = { id, name, size, type?, url }`.

| Maydon | Tip |
|---|---|
| id | String |
| ownerId | String |
| purpose | `MESSAGE \| DELIVERY \| KYC \| PORTFOLIO \| DISPUTE_EVIDENCE \| SERVICE_MEDIA \| AVATAR \| PAYMENT_RECEIPT` |
| storageKey | String (S3 obyekt kaliti) |
| bucket | String (KYC — **alohida bucket**, public access yopiq) |
| fileName / mimeType / sizeBytes | |
| scanStatus | `PENDING \| CLEAN \| INFECTED` (ClamAV worker) |
| createdAt | DateTime |

`url` — presigned GET, TTL 5 daqiqa (KYC), qolganlarga uzunroq. Server hech
qachon fayl baytini proxy qilmaydi. `filesService.upload` bitta chaqiruv
bo'lib qoladi (backend presigned PUT beradi, adapter yashiradi) YOKI 2-bosqichli
— Bosqich 5'da hal.

### Notification

Manba: `AppNotification`.

| Maydon | Tip |
|---|---|
| id / userId | String |
| kind | NotificationKind |
| messageKey | String (i18n kaliti — `00-api-surface.md` §6) |
| params | Json (`Record<string,string>`) |
| href | String (ichki yo'l, `safeHref`) |
| read | Boolean @default(false) |
| createdAt | DateTime |

Kursorli. Retention siyosati (mock 150 ta). Offline yetkazish — `OutboxEvent`
→ BullMQ 15 min → SMS/Telegram/email.
Indekslar: `@@index([userId, read, createdAt])`.

---

## 5. Moliya (ledger — eng muhim)

> **ADR-01/ADR-08.** Balans ledger'dan. Frontend `sb2_balances`/`sb2_withdrawn`
> ustunlarini emas, `GET /wallet/balance` javobini o'qiydi.

### LedgerAccount

`id, type: LedgerAccountType, ownerId? (user hisoblari uchun), currency,
createdAt`. `@@unique([type, ownerId, currency])`.

### LedgerEntry  (append-only)

`id, transactionId, accountId, amount: BigInt (musbat/manfiy), currency,
createdAt`. **Invariantlar:**
- Bir `transactionId` bo'yicha `SUM(amount) = 0` — tranzaksiya ichida
  tekshiruv + DB constraint trigger.
- Har `amount % 100 === 0` (butun so'm tiyinda) — `LedgerService.post()`
  yozishdan oldin tekshiradi, aks holda `InvariantViolationError` + rollback.
- UPDATE/DELETE yo'q. Xato → `REVERSAL` transaction.

### Transaction (jurnal boshi)

`id, kind: TransactionKind, referenceType, referenceId, actorId, actorType,
idempotencyKey?, note, createdAt`. Admin "Tranzaksiyalar" ekrani
(`TransactionRecord`) = shu jadval + hosil qilingan ko'rinish (§7 admin).

**Namunaviy oqimlar** (tiyin, `feeRateBps` snapshot, floor yaxlitlash):

```
fundContract (T = totalAmount):
    DEPOSIT + ESCROW_FUND
    GATEWAY_CLEARING  -T
    PLATFORM_ESCROW   +T
    USER_ESCROW(buyer) +T ; PLATFORM_ESCROW -T   (per-user escrow ko'zgu; ixtiyoriy)

acceptMilestone (m = milestone.amount; fee = floor(m * feeRateBps / 10000); net = m - fee):
    MILESTONE_RELEASE + COMMISSION
    PLATFORM_ESCROW      -m
    USER_AVAILABLE(seller) +net
    PLATFORM_REVENUE       +fee      ← qoldiq shu yerda (floor tufayli)

cancelContract / dispute REFUND (r = escrow'dagi summa):
    REFUND
    PLATFORM_ESCROW        -r
    USER_AVAILABLE(buyer)  +r        ← frontend'dagi "balans"

dispute SPLIT (buyerShare = min(splitAmount, escrowPool)):
    PLATFORM_ESCROW -buyerShare ; USER_AVAILABLE(buyer) +buyerShare
    PLATFORM_ESCROW -(pool-buyerShare) ; USER_AVAILABLE(seller) +(pool-buyerShare)
    Contract.totalAmount -= buyerShare

approveWithdrawal (EARNINGS, w = amount):
    PAYOUT
    USER_AVAILABLE(seller) -w
    PAYOUT_PENDING         +w
  → payout CONFIRMED: PAYOUT_PENDING -w ; (tashqi tizim)
```

### Wallet balance  (**ADR-08** — `GET /wallet/balance`)

Ledger'dan hisoblanadi, ustun emas. Javob:
`{ available, pendingClearance, inEscrow, currency }` (butun so'm).
- `available` = `USER_AVAILABLE` balansi − band (`PENDING`/`UNDER_REVIEW`
  yechish so'rovlari).
- `pendingClearance` = qabul qilingan, lekin ushlab turish muddati
  (`PlatformSetting.payoutHoldDays`, sukut 3) tugamagan `MILESTONE_RELEASE`.
- `inEscrow` = `USER_ESCROW` (buyer) yoki seller uchun "kutilayotgan daromad"
  (`FUNDED`/`SUBMITTED`/`REVISION_REQUESTED` bosqichlar `netAmount`).

Adapter `getBalance` / `getWithdrawnTotal` / `getPendingWithdrawalTotal` ni
shu bitta javobdan yasaydi.

### PaymentIntent / PaymentCallback  (**ADR-03**)

Frontend `PaymentDTO { id, contractId, provider, providerReference?,
idempotencyKey, amount, currency, status, createdAt, updatedAt }`.

**PaymentIntent** (id, contractId, provider: PaymentMethod, amount: BigInt,
currency, status: PaymentStatus, providerTransactionId? @unique,
idempotencyKey @unique, redirectUrl?, returnedAt?, confirmedAt?, createdAt,
updatedAt, version).
**PaymentCallback** (id, paymentIntentId, provider, rawPayload: Json,
signatureValid: Boolean, providerTransactionId @unique, receivedAt) —
at-least-once; `providerTransactionId` unique bilan idempotent; imzo
yaroqsiz → 401, hech narsa yozilmaydi (fail closed).

`fundContract` → `FundResult`:
- `WALLET` → sinxron `{ kind: 'funded', contract }` (ledger'da `DEPOSIT` yo'q,
  to'g'ridan-to'g'ri `USER_AVAILABLE(buyer) → ESCROW`).
- `PAYME`/`CLICK` → `PaymentIntent` yaratiladi, `{ kind: 'redirect',
  paymentId, url }`. Contract `SIGNED` (frontend `imzolangan`) bo'lib qoladi.
- `PaymentCallback` YOKI return-page polling (`GET /payments/:id`) —
  kim birinchi kelsa, `PaymentIntent` ni idempotent `PAID` qiladi va shunda
  `ESCROW_FUND` transaction yoziladi + Contract `ACTIVE`.

`Contract.paymentStatus` — `PaymentIntent.status` dan derived cache
(`PENDING_VERIFICATION`/`CONFIRMED`/`REJECTED`).

### Wallet (materialized view)

Ixtiyoriy o'qish-keshi — `USER_AVAILABLE` + `USER_ESCROW` ledger'dan.
Hech qachon yozib hisoblanmaydi; ledger'dan qayta tiklanadi.

### PaymentCard

Manba: `PaymentCard`. `id, userId, type: CardType, last4, holderName, expiry
("MM/YY"), pspToken? (agar ekvayring token bersa), createdAt`. **To'liq raqam /
CVV SAQLANMAYDI.** Maks 5 (`CARD_LIMIT`). `@@unique([userId, type, last4])`.

### WithdrawalRequest / Payout

Manba: `WithdrawalRequest` (UMUMIY — user yaratadi, staff qayta ishlaydi).

| Maydon | Tip |
|---|---|
| id / userId | String |
| userName / userRole | denorm |
| source | WithdrawalSource (EARNINGS / BALANCE) |
| amount | BigInt |
| currency | String @default("UZS") |
| destType | PayoutDestType |
| cardId | String? |
| cardMask | String? (niqob "UZCARD •••• 4589") |
| bankAccount | `PayoutDestination` (accountNumber, bankName, mfo, innOrPinfl, recipientName) — embed yoki alohida jadval |
| status | WithdrawalStatus |
| payout | `Payout?` (status: PayoutStatus, reference?, receiptKey?, sentAt?, confirmedAt?, failedReason?) |
| createdAt / processedAt / processedByStaffId / rejectionReason | |

"Band" summa = `status ∈ {PENDING, UNDER_REVIEW}` bo'yicha `SUM(amount)`.
`PlatformSetting.minPayoutAmount` — `BELOW_MIN_PAYOUT`.
**Q29 — real payout rail:** v1'da staff qo'lda "SENT/CONFIRMED" belgilaydi;
`Payout` modeli rail keлганда tayyor.

### PlatformFeeConfig  (**ADR-05**)

`id, feeRateBps: Int, effectiveFrom: DateTime, createdByStaffId, note`.
`Contract` yaratilganda amaldagi (`effectiveFrom <= now`, eng yangi) qiymat
`feeRateBps` ga snapshot. `PlatformSetting.platform_commission_percent`
`readOnly` UI'da ko'rsatiladi (joriy qiymat), lekin o'zgartirish shu jadval
orqali (staff `SETTINGS` + `SUPER_ADMIN`).

### Refund

Frontend `RefundRecord` — `forceCloseContract` refund/split da yoziladi.
Alohida jadval EMAS: `Transaction(kind = REFUND)` + hosil qilingan ko'rinish
(`Q38` — ADR: ledger). Kerakli metadata (`reason`, `processedByStaffId`)
`Transaction.note` / bog'liq `Dispute` da.

### IdempotencyKey  (prompt talabi — frontend'da yo'q)

`key + userId + endpoint` @unique, `requestHash`, `responseSnapshot: Json`,
`statusCode`, `createdAt`, TTL (24 soat). Har pul-harakati endpoint'i
`Idempotency-Key` header qabul qiladi; callback'lar `providerTransactionId`
unique bilan.

---

## 6. Denormal/computed maydonlar inventari

| Model.maydon | Turi | Qachon yangilanadi | Manba mantiq |
|---|---|---|---|
| `SellerProfile.rating` | denorm | `Review` PUBLISHED bo'lganda, staff `deleteReview` | surilgan o'rtacha |
| `SellerProfile.reviewCount` | denorm | ↑ bilan | |
| `SellerProfile.completedContracts` | denorm | `Contract → COMPLETED` (accept oxirgi, avto-qabul, arbitraj PAYOUT/SPLIT) | +1 |
| `SellerProfile.badge` | denorm | yuqoridagi har biri | `computeBadge(completed, rating)`: 5+/4.5→TRUSTED, 25+/4.8→TOP_RATED |
| `SellerProfile.identityVerified` | **computed** | har o'qish | `verification.status === APPROVED` |
| `SellerProfile.completionRate` | **computed** | har o'qish | `COMPLETED / (COMPLETED + CANCELLED)`, ikkalasi 0 → `null` |
| `Job.proposalsCount` | denorm | `Proposal` yaratilganda +1, WITHDRAWN −1 | |
| `Job.buyerName` / `buyerRating` | denorm | e'lon yaratilganda | |
| `Contract.buyerName` / `sellerName` | denorm | yaratilganda; hisob o'chsa "O'chirilgan foydalanuvchi" | |
| `Contract.totalAmount` | denorm | = Σ milestone.amount; SPLIT da kamayadi | |
| `Contract.feeRateBps` | **snapshot** | yaratilganda | `PlatformFeeConfig` |
| `Contract.paymentStatus` | derived cache | `PaymentIntent` o'zgarganda | |
| wallet `available`/`pendingClearance`/`inEscrow` | **computed** | so'rovda | ledger'dan |
| `Wallet` (mat. view) | cache | ledger yozuvida refresh | ledger'dan qayta tiklanadi |
| admin counters / facets | agregat | so'rovda | `COUNT`/`SUM ... GROUP BY` |
| `Category` serviceCount | agregat | so'rovda | |

> **Qoida:** denorm yangilanish sharh/shartnoma yozuvi bilan BITTA
> tranzaksiyada.

---

## 7. Boshqaruv / moderatsiya

### Verification (KYC)  (ADR: alohida bucket, har o'qish AuditLog)

Manba: `VerificationRecord`. Bir user — bir joriy yozuv.

| Maydon | Tip |
|---|---|
| id | String |
| userId | String |
| status | VerificationStatus |
| country | VerificationCountry |
| documentType | VerificationDocType |
| legalName | String |
| birthDate | Date (18+) |
| documents | `Attachment[]` (purpose=KYC, alohida bucket, shifrlangan at-rest) |
| submittedAt / reviewedAt / reviewedByStaffId / rejectionReason | |
| expiresAt | DateTime? (Q44 — v1.1: EXPIRED avto) |

`@@index([userId])`, `@@index([status, submittedAt])`. Hujjat o'qish —
`KYC_REVIEWER`/`SUPER_ADMIN`; har GET presigned URL `AuditLog` ga
(`actorType=STAFF`, resource, contextId).

### Dispute / DisputeEvidence

Manba: `Dispute`.

| Maydon | Tip |
|---|---|
| id / contractId | String |
| openedById | String |
| reason | DisputeReason |
| description | String |
| evidence | `DisputeEvidence[]` (id, uploadedById, attachmentId, note?, createdAt) |
| status | DisputeStatus |
| outcome | DisputeOutcome? |
| appealable | Boolean @default(true) |
| createdAt / resolvedAt / resolvedByStaffId / resolution | |

Arbitraj mantiq — `00-api-surface.md` §4.5 (`forceCloseContract`). FAQAT
escrow'dagi (`FUNDED`/`SUBMITTED`/`REVISION_REQUESTED`) bosqichlarni
taqsimlaydi.

### Review  (ADR: ikki tomonlama, ko'r-ko'rona, 14 kun)

Manba: `Review`. Yangi shakl:

| Maydon | Tip |
|---|---|
| id / contractId | String |
| authorId / targetId | String |
| direction | ReviewDirection |
| rating | Int (1–5) |
| comment | String |
| status | ReviewStatus |
| submittedAt | DateTime |
| publishedAt | DateTime? |
| createdAt | |

`@@unique([contractId, direction])`. **Ko'r-ko'rona:** `PUBLISHED` bo'ladi
faqat (a) ikkala yo'nalish ham `submittedAt` bor, YOKI (b) `submittedAt +
14 kun` o'tgan (BullMQ job). Shungacha qarshi tomon ko'rmaydi.
`reviewsService.getForContract` — joriy foydalanuvchi yozgan sharhini doim
qaytaradi; qarshi tomonnikini faqat `PUBLISHED` bo'lsa.

Staff moderatsiya: `status = HIDDEN` (`ReviewModerationItem` — reportCount,
flagged). `deleteReview` → `SellerProfile.rating` qayta hisoblanadi.

### TrustReport (shikoyat)

Manba: `admin-types.ts` `TrustReport`. User-submitted + avto
(anti-circumvention, `reporterId = "system_anti_circumvention"`).

`id, reporterId (yoki SYSTEM), reporterName, targetType (USER|SERVICE|JOB|
MESSAGE), targetId, targetTitle, reasonType: TrustReportReason, description,
evidenceAttachmentId?, severity, status, assignedStaffId?, resolutionNote?,
actionTaken: TrustReportAction?, createdAt, resolvedAt?`.

**User-facing "shikoyat qilish" endpoint — v1.1** (Q39). v1'da faqat avto +
seed. `POST /reports` skeletoni qoldiriladi, guard: `501 Not Implemented`
emas — hozircha yo'q.

### UserAppeal  (v1.1 — Q40)

`id, userId, userName, userRole, restrictionType (SUSPENDED|BLOCKED|
RESTRICTED), originalReason, appealText, evidence: Attachment[], status:
UserAppealStatus, reviewerStaffId?, decisionNote?, createdAt, resolvedAt?`.
v1'da yaratish endpoint YO'Q; staff `handleUserAppeal` bor. `Dispute.appealable`
hozirdan mavjud.

### UserModeration

`userId @id, status: UserModerationStatus, reason?, suspendedAt?,
suspendedUntil?, deactivatedAt?, deletedAt?, resolvedAt?, byStaffId?`.
`AdminUserRow.moderationStatus` shundan JOIN. `blockedUserIds` — bu jadvaldan
(`status ∈ {SUSPENDED, BLOCKED, DEACTIVATED, DELETED}`).

### InternalNote

`id, targetId, targetType (USER|TICKET|DISPUTE|KYC|REPORT|ORDER), staffId,
staffName, text, createdAt`.

### AuditLog  (**ADR: kabinet pul hodisalari ham** — Q36)

`id, actorId, actorType: AuditActorType, actorName, action, resourceType,
resourceId, contextId?, previousState?: Json, newState?: Json, ip?, userAgent?,
requestId, createdAt`.

Yoziladi: **har pul harakati** (fund, milestone accept, withdraw request,
withdraw approve/reject, arbitraj), staff moderatsiya qarorlari, KYC hujjat
o'qish, kill-switch o'zgarishi, rol almashtirish. Frontend `AuditEvent`
(`{adminId, adminName, action, target, details?, previousState?, newState?}`)
— shu jadvalning admin-ko'rinishi (faqat `actorType=STAFF`).

### OutboxEvent  (prompt talabi)

`id, aggregateType, aggregateId, eventType, payload: Json, createdAt,
processedAt?, attempts: Int, lastError?`. Tranzaksiya ICHIDA yoziladi
(HTTP call yo'q), alohida worker jo'natadi: Telegram (support, notification
fallback), SMS (OTP, payout), email, provider webhook.

---

## 8. Tizim / konfiguratsiya

### PlatformSetting

Manba: `platform-settings.ts` + admin `PlatformSettingItem`. Kichik qat'iy
keyset:
- `escrow_auto_release_days` (Int 1–30, def 3) — `Milestone.reviewDeadline`
- `payout_hold_days` (Int, def 3) — wallet `pendingClearance`
- `min_payout_amount` (BigInt, def 50 000 so'm)
- `marketplace_instant_offer_enabled` (Bool) — `OFFERS_DISABLED`
- `registration_enabled` (Bool, kill-switch) — `REGISTRATION_PAUSED`
- `payments_paused` (Bool, kill-switch) — `PAYMENTS_PAUSED`

`{ key, group (MARKETPLACE|FINANCE|ESCROW|SECURITY), valueType (STRING|INT|
BOOL), value: Json, readOnly: Bool, updatedByStaffId?, updatedAt }`.
`platform_commission_percent` — `readOnly: true`, joriy qiymat
`PlatformFeeConfig` dan (build EMAS — ADR-05). Kill-switch'lar **server-side
majburlanadi** tegishli endpoint'larda.

### SupportTicket / SupportMessage

`SupportTicket` (id, userId, topic: SupportTopic, subject ≤160, message,
status: SupportTicketStatus, createdAt).
`SupportMessage` / `TicketMessage` (id, ticketId, senderId (user yoki staff),
isStaff: Bool, text, createdAt) — `sb2_ticket_chat_<id>` o'rniga.

### SupportRequest  (ADR: backend'ga ko'chiriladi)

`/api/support` (Next route) → `SupportService`. `id, userId?, category:
SupportRequestCategory, message, contactName?, contactInfo?, source, route,
createdAt`. Telegram xabari — `OutboxEvent`. Rate limit — `@nestjs/throttler`
(Redis).

### PageFeedback  (ADR: backend'ga kiritiladi)

`id, type: FeedbackType, message, pageUrl, pageTitle, userId?, userName?,
userRole?, userContact?, status: FeedbackStatus, staffNote?, createdAt,
updatedAt?`. Staff `REPORTS`/`SETTINGS` ostida ko'radi.

### SavedItem

`sb2_saved_jobs` + `sb2_saved_market` o'rniga: `SavedItem` (userId, kind:
`JOB | MARKET`, itemId, createdAt, `@@unique([userId, kind, itemId])`).

### AccountPreferences

`userId @id, messages, contracts, payments, marketing, proposals` — bool
kanallar. Notification/OutboxEvent yo'naltirishda tekshiriladi.

---

## 9. Qarorlar holati

Barcha Bosqich-0 modellashtirish savollari hal qilindi (`docs/02-decisions.md`).
**Bosqich 2+ ga qoldirilganlar** hujjatda joyida belgilangan:

| Element | Qachon | Hozirgi holat |
|---|---|---|
| `register`→OTP semantikasi | Bosqich 2 | `User`/`Session`/`RefreshToken` ikkalasini qo'llaydi |
| `BuyerProfile` alohida jadval | Bosqich 3 | `buyerProfile?` optional relation qoldirildi |
| `Job.status` boy to'plam (Q46) | Bosqich 3 | enum'da `OPEN | CLOSED`, kengaytириladigan |
| `ServicePackage` (Q22) | Bosqich 3 | `packages?` optional relation |
| `rejectCloseContract` (Q16) | Bosqich 4 | modelda `closeRequested` bor, "reject" harakati aniqlanmagan |
| `Delivery`/`RevisionRequest` tarixi | Bosqich 4 | alohida jadval sifatida kiritildi |
| `responseTimeHours` haqiqiy (Q31) | Bosqich 6 | `Int?`, hozircha statik |
| `filesService.upload` 1 yoki 2 bosqichli (Q24) | Bosqich 5 | `Attachment` modeli ikkalasini qo'llaydi |
| Real payout rail (Q29) | Bosqich 5 | `Payout` modeli tayyor, staff qo'lda belgilaydi |
| KYC `EXPIRED` avto (Q44) | v1.1 | `expiresAt DateTime?` bor |
| User-facing shikoyat/apellyatsiya (Q39/Q40) | v1.1 | modellar bor, yaratish endpoint yo'q |
| Qo'lda bank o'tkazma (b2b) | v1.1 | `ManualBankTransfer` alohida jadval sifatida rejalashtirildi |
