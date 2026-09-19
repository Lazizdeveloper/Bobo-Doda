# 00 — API Surface (frontend contract)

> **Bosqich 0 natijasi.** Frontend `@/lib/api` (kabinetlar) va `@/lib/api/admin`
> (admin) orqali gaplashadi. Backend'ning vazifasi — shu ikki chegarani
> **bir xil imzo va bir xil qaytish shakli** bilan qoplash. Bu hujjat har bir
> metodni sanab chiqadi; ma'lumot modeli — `01-data-model.md`.
>
> Kod hali yozilmadi. Oxirida **ochiq savollar** ro'yxati bor — ular hal
> bo'lmaguncha 1-bosqichga o'tilmaydi.

---

## 1. Chegara qanday ishlaydi

| Fayl | Rol | Backend'da |
|---|---|---|
| `lib/api/contracts.ts` | Typed service interfeyslari + DTO (`AuthService`, `PaymentsService`, `ApiPage<T>`, `ApiListQuery`, `PaymentDTO`) | **O'zgarmaydi** — shartnoma |
| `lib/api/errors.ts` | `ApiError` + `ApiErrorCode` taksonomiyasi, HTTP status ↔ kod, `retryable`, `fieldErrors`, `toApiError(Response)` | **O'zgarmaydi** |
| `lib/api/state-machines.ts` | 9 ta holat mashinasi (quyida) — UI va server bitta manbadan | Ulashiladi |
| `lib/api/client.ts` | Kabinet adapteri — interfeyslarni **amalga oshiradi** (hozir `lib/mock-api` ga delegatsiya) | **Almashtiriladigan yagona fayl** |
| `lib/api/admin.ts` | Admin adapteri — har amalni `guard()/asyncGuard()` bilan `ApiError` ga o'raydi | **Almashtiriladigan yagona fayl** |
| `lib/api/index.ts` | Yagona ommaviy eksport (`export *`) | O'zgarmaydi |

**Qoidalar:**
- UI faqat `@/lib/api` va `@/lib/api/admin` dan import qiladi, hech qachon
  `@/lib/mock-api` / `@/lib/admin-api` dan to'g'ridan-to'g'ri emas
  (`app/`+`components/` da bunday import 0 ta).
- Ekranlar **domen service obyektini** chaqiradi: `contractsService.list()`,
  `paymentsService.fundContract(id)` — loose funksiya emas.
- `@/lib/api` dan import qilinadigan no-service nomlar faqat ikkitasi:
  `DATA_CHANGED_EVENT` (admin layout) va `ApiError` (`components/ui/ErrorState.tsx`).
- Har bir tashlangan xato `withNormalizedErrors` (= `call()`) orqali `ApiError`
  ga normallashadi. `client.ts` da HTTP variant: `if (!res.ok) throw await toApiError(res)`.

### Adapter almashtirish retsepti (`client.ts`)

```ts
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw await toApiError(res);
  return res.status === 204 ? (undefined as T) : res.json();
}
// jobsService.list: () => call(() => http<Job[]>("/jobs"))
```

---

## 2. Wire konvensiyalari (hozirgi holat)

| Mavzu | Hozir | Backend prompt talabi | → Savol |
|---|---|---|---|
| **Pul (DTO)** | Butun **so'm** (UZS). `totalAmount`, `Milestone.amount`, `bidAmount`, `budgetMin/Max`, `Service.price`, `WithdrawalRequest.amount` | **DTO butun so'm bo'lib qoladi.** DB + ledger — `BigInt` tiyin. Chegara: DTO⇄DB ×100/÷100, yo'qotishsiz (ledger'ga faqat `amount % 100 === 0` yoziladi) | ✅ **ADR-01** |
| **Frontend pul hisoblamaydi** | `daromad`/`xarajatlar` 5% ni o'zi hisoblaydi (`sellerNet`) | API `amount, feeAmount, netAmount, currency, feeRateBps` — hisoblangan qaytaradi. Frontend qiymati faqat display; farq bo'lsa keyingi kichik PR tuzatadi. Backend hech qachon frontend hisobiga ishonmaydi | ✅ **ADR-01** |
| **Valyuta** | `currency` literal `"UZS"` | `amount`+`currency` doim juft. v1 faqat `UZS`, default yo'q | ✅ |
| **Komissiya** | `lib/fees.ts` `PLATFORM_FEE_PERCENT = 5` (build konstantasi) | **Runtime**, `PlatformSetting` (versiyalangan). `Contract` yaratilganda amaldagi stavka `feeRateBps` ga **snapshot**. Eski shartnoma joriy stavkani hech qachon o'qimaydi | ✅ **ADR-05** |
| **Yaxlitlash** | `Math.round` | **Floor**, qoldiq → `PLATFORM_REVENUE`. `LedgerService.post()` yozishdan oldin har entry `amount % 100 === 0` tekshiradi → `InvariantViolationError` + rollback | ✅ **ADR-01** |
| **Sana** | ISO-8601 string | — | — |
| **id** | String UUID (mock prefiksli: `cnt-…`, `ms-…`) | Toza UUID v4/v7. Frontend prefiksga tayanmaydi | ✅ |
| **Enum qiymatlari (wire)** | **O'zbekcha literal** (`"faol"`, `"mablaglangan"` …); UI shu literalga `switch` + `assertTransition` | **API INGLIZCHA `UPPER_SNAKE`** (`ACTIVE`, `FUNDED`, `SUBMITTED` …). O'zbekchaga aylantirish `lib/api/wire-enums.ts` adapterida — har SM uchun exhaustive `Record<Backend,Frontend>` + teskari. Backend yangi qiymat qo'shsa `tsc` xato. Map to'liqligi test bilan (manba = OpenAPI) | ✅ **ADR-02** |
| **Pagination** | Kabinet ro'yxatlari to'liq `T[]`; `ApiPage<T>` aniqlangan, ishlatilmaydi | **Kursorli:** xabar, bildirishnoma, ledger, audit. **Offsetli:** admin navbatlari, katalog. Aralash — normal | ✅ **ADR-06** |
| **Realtime** | `DATA_CHANGED_EVENT` — brauzer eventi | **v1: WebSocket YO'Q.** Polling — faol oyna 3 s, fon 15 s. Service qatlami transportdan mustaqil | ✅ **ADR-07** |
| **Adapter ruxsati** | — | **`lib/api/client.ts` + `lib/api/*.ts` ni o'zgartirishga RUXSAT.** Komponent, sahifa, `lib/types.ts` — TEGILMAYDI | ✅ (yangi qoida) |

---

## 3. Kabinet servicelari (`lib/api/client.ts`)

Barcha metodlar `Promise<…>` (sync deb belgilanmagan bo'lsa). Argument/qaytish
tiplari `@/lib/types` dan (`Model.*`).

### 3.1 `authService : AuthService`

| Metod | Argument | Qaytadi | Izoh |
|---|---|---|---|
| `getSession()` | — | `Session \| null` **(SYNC)** | Brauzerdagi snapshot (`userId/role/profileDone/verified`). Real token httpOnly cookie'da; bu HIMOYA EMAS. Har render'da guard'lar chaqiradi |
| `login(input)` | `{ phone, password }` | `Session` | `INVALID_CREDENTIALS`, `ACCOUNT_BLOCKED`. Onboarding qayerda to'xtagan bo'lsa sessiya o'sha holatdan tiklanadi |
| `register(input)` | `{ phone, password, fullName }` | `Session` | Telefon unikal → `PHONE_EXISTS`; `WEAK_PASSWORD` (≥8, harf+raqam); `REGISTRATION_PAUSED`. **OCHIQ (Bosqich 2):** frontend `register` darhol `Session` qaytarishini kutadi (onboarding guard'lar shunga tayanadi), `BACKEND_INTEGRATION.md` esa `register`→OTP so'rovi, `verify`→token istaydi. Ikkisidan qaysi biri — Bosqich 2 boshida hal qilinadi. `User`/`Session`/`RefreshToken` modellari ikkalasini ham qo'llab-quvvatlaydigan qilib loyihalanadi |
| `loginWithTelegram(payload?)` | `{ id?, username?, first_name?, role? }` | `Session` | Avto-`verified: true` |
| `loginWithGoogle(payload?)` | `{ email?, name?, sub?, role? }` | `Session` | Avto-`verified: true` |
| `verifyTelegram(code?)` | `code?: string` (6 raqam) | `Session` | Oxirgi onboarding qadami; `INVALID_CODE` |
| `verifyGoogle(email?)` | `email?: string` | `Session` | `email` hisobga saqlanadi (tiklash uchun) |
| `chooseRole(role)` | `"mutaxassis" \| "xaridor"` | `Session` | `User.role` + `roleChosen` yangilanadi |
| `resetPassword(input)` | `{ phone, code, newPassword, method?: "sms"\|"telegram"\|"google" }` | `void` | `INVALID_CODE` (6 raqam), `WEAK_PASSWORD`, `USER_NOT_FOUND` (ataylab oshkor) |
| `refresh()` | — | `Session \| null` | `client.ts` HTTP qatlami chaqiradi: har 401 da BIR marta `refresh()` + qayta yuborish, ikkinchi 401 da `logout()` |
| `logout()` | — | `void` **(SYNC)** | — |

### 3.2 `usersService : UsersService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `getCurrent()` | — | `User \| null` (parolsiz) |
| `getSellerProfile()` | — | `SellerProfile` (+ `identityVerified`, `completionRate` hisoblanadi) |
| `updateName(fullName)` | `string` | `void` — *(interfeysda bor, UI'da ishlatilmaydi)* |
| `updateUserProfile(data)` | `Partial<User>` | `void` (xaridor/kompaniya maydonlari: `companyName`, `industry`, `website`, `location`, `bio`, `email`, …) |
| `completeSellerProfile(input)` | `{ fullName, bio, skills[], categories[], location }` | `void` (profil wizardi) |
| `updateSellerProfile(input)` | `{ fullName, bio, headline?, skills?, categories?, languages?: ProfileLanguage[], portfolio?: PortfolioItem[], location? }` | `void` |
| `setAvailability(available)` | `boolean` | `void` |
| `getPreferences()` | — | `AccountPreferences` (`{messages, contracts, payments, marketing, proposals?}`) |
| `savePreferences(prefs)` | `AccountPreferences` | `void` |
| `changePassword(current, next)` | `string, string` | `void` — `INVALID_CURRENT_PASSWORD`, `WEAK_PASSWORD` |
| `exportData()` | — | `Record<string, unknown>` (GDPR-uslub eksport, parolsiz) |
| `deleteAccount()` | — | `void` — `ACTIVE_CONTRACTS` bo'lsa bloklanadi |

### 3.3 `catalogService : CatalogService` (ochiq katalog)

| Metod | Argument | Qaytadi |
|---|---|---|
| `listSpecialists()` | — | `Specialist[]` (`{ user, profile }`) — faqat `bio` to'ldirilgan mutaxassislar |
| `getSpecialist(userId)` | `string` | `Specialist \| null` |
| `listSellerReviews(sellerId)` | `string` | `Review[]` |

### 3.4 `savedService : SavedService` (bookmark)

| Metod | Qaytadi |
|---|---|
| `listJobIds()` | `string[]` |
| `toggleJob(jobId)` | `string[]` (yangi ro'yxat) |
| `listMarketIds()` | `string[]` |
| `toggleMarketItem(id)` | `string[]` |

### 3.5 `servicesService : ServicesService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `listMine()` | — | `Service[]` |
| `listPublic()` | — | `Service[]` (faqat `status === "active"`) |
| `get(id)` | `string` | `Service \| null` |
| `create(input)` | `Omit<Service, "id"\|"sellerId"\|"currency"\|"createdAt">` | `Service` — `FORBIDDEN` (rol), `CATEGORY_DISABLED` |
| `update(id, input)` | `string, Partial<Omit<Service,"id"\|"sellerId"\|"createdAt">>` | `Service` — egalik: `NOT_FOUND` |
| `remove(id)` | `string` | `void` |

`Service` maydonlari: `category` (8-qiymatli enum), `title`, `description`,
`fields: Record<string, string\|string[]>` (kategoriyaga xos), `price`,
`deliveryDays`, `images: string[]`, `status: "active"\|"paused"\|"draft"`,
`revisionsIncluded?`, `included?: string[]`, `requirements?: string[]`,
`extras?: {label, price}[]`.

### 3.6 `jobsService : JobsService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `list()` | — | `Job[]` (barcha e'lonlar — mutaxassis ko'radi) |
| `get(id)` | `string` | `Job \| null` |
| `listMine()` | — | `Job[]` (xaridorning o'z e'lonlari) |
| `create(input)` | `{ title, description, category, budgetMin, budgetMax, skillsRequired[], screeningQuestions[] (≤3), deadline?, attachedImages? }` | `Job` — `FORBIDDEN`, `CATEGORY_DISABLED`, `CIRCUMVENTION_DETECTED` |
| `close(id)` | `string` | `Job` — faol takliflarni avto-rad etadi |

`Job` denormalizatsiya: `buyerName`, `buyerRating`, `proposalsCount`, `currency`,
`status: "ochiq" \| "yopilgan"`.

### 3.7 `proposalsService : ProposalsService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `listMine()` | — | `Proposal[]` (mutaxassis) |
| `get(id)` | `string` | `Proposal \| null` (egalik: taklif egasi YOKI e'lon egasi) |
| `listForJob(jobId)` | `string` | `Proposal[]` (faqat e'lon egasi) |
| `create(input)` | `{ jobId, bidAmount, coverLetter, screeningAnswers: {question,answer}[], attachedImages: string[], estimatedDeliveryDays? }` | `Proposal` — `FORBIDDEN`, `DUPLICATE_PROPOSAL` (bir ishga bitta faol taklif) |
| `setStatus(id, status)` | `id, "korib_chiqilmoqda"\|"suhbat"\|"rad_etildi"` | `Proposal` — `assertTransition(proposalMachine, …, "buyer")` |
| `hire(proposalId, milestones)` | `id, { title, description, amount, dueDate }[]` | **`Contract`** — bosqichlar `kutilmoqda`, shartnoma `imzolangan` (to'lovsiz), e'lon yopiladi, qolgan takliflar avto-rad. `TOO_MANY_MILESTONES` (>20), `DUPLICATE` |
| `withdraw(id)` | `string` | `Proposal` (`qaytarib_olingan`) — faqat `job` ochiq bo'lsa |

### 3.8 `offersService : OffersService` (to'g'ridan-to'g'ri taklif — A yo'l)

| Metod | Argument | Qaytadi |
|---|---|---|
| `get(id)` | `string` | `Offer \| null` (egalik: taklif tomonlari) |
| `create(input)` | `{ sellerId, serviceId?, title, message, budget }` | `Offer` — `FORBIDDEN` (rol/o'ziga), `OFFERS_DISABLED` (kill-switch), `DUPLICATE_OFFER` (bir mutaxassisga bitta kutilayotgan). Boshlang'ich xabar taklif chatiga yoziladi |
| `listSent()` | — | `Offer[]` (xaridor) |
| `listIncoming()` | — | `Offer[]` (mutaxassis) |
| `accept(id)` | `string` | **`Contract`** — `sourceType` = `xizmat` (agar `serviceId`) yoki `taklifnoma`; 1 bosqich `kutilmoqda`; shartnoma `imzolangan`; taklif chati shartnoma chatiga ko'chadi (`Message.contractId` yangilanadi) |
| `withdraw(id)` | `string` | `Offer` (`bekor_qilingan`) — faqat xaridor, faqat `yuborilgan` |
| `decline(id)` | `string` | `Offer` (`rad_etildi`) — faqat mutaxassis |

### 3.9 `contractsService : ContractsService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `list()` | — | `Contract[]` — sessiya roliga qarab filtrlangan (buyer tomoni / seller tomoni). O'qishda `applyEscrowRules()` ishlaydi (avto-qabul) |
| `get(id)` | `string` | `Contract \| null` (egalik: tomonlar) |
| `cancel(id)` | `string` | `Contract` (`bekor_qilingan`) — `imzolangan`/`faol` dan; `HAS_SUBMITTED_WORK` bloklaydi; `mablaglangan` bosqich summasi xaridor **balansiga** (`sb2_balances`) qaytadi, bosqichlar `kutilmoqda` ga |
| `requestClose(id, note?)` | `string, string?` | `Contract` (`closeRequested: true`) — mutaxassis so'raydi, chatga xabar |
| `approveClose(id)` | `string` | `Contract` (`yakunlangan`) — xaridor barcha qolgan bosqichni `qabul_qilindi` qiladi, `incrementCompletedContracts` |
| `sign(id)` | `string` | `Contract` — ikki tomonlama e-imzo; `contractNumber`, `*AcceptedName/Phone/At` to'ldiriladi |

> **Eslatma:** `rejectCloseContract(id, reason?)` mock'da bor, lekin
> `ContractsService` interfeysida YO'Q va UI chaqirmaydi → **Q16**.

### 3.10 `milestonesService : MilestonesService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `list(contractId)` | `string` | `Milestone[]` — egalik `NOT_FOUND`, `applyEscrowRules()` ishlaydi |
| `listMine()` | — | `Milestone[]` (rolga qarab barcha shartnomalarim bo'yicha) |
| `submit(id, deliverable?)` | `id, { link?, note?, files?: DeliverableFile[] }` | `Milestone` (`topshirildi`) — faqat seller, shartnoma `faol`; `mablaglangan`/`ozgartirish_soraldi` dan; `reviewDeadline = now + escrowAutoReleaseDays` |
| `accept(id)` | `string` | `Milestone` (`qabul_qilindi`) — faqat buyer, shartnoma `faol`; barchasi qabul bo'lsa shartnoma `yakunlangan` + reputatsiya + tranzaksiya yozuvlari (net + commission) |
| `requestRevision(id, comment)` | `string, string` | `Milestone` (`ozgartirish_soraldi`) — `COMMENT_REQUIRED`, `REVISION_LIMIT_REACHED` (`revisionsIncluded`, sukut 3) |

### 3.11 `filesService : FilesService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `upload(file)` | `File` | `DeliverableFile` = `{ id, name, size, type, url }` |

Yagona yuklash chegarasi (chat biriktirmasi + bosqich topshirig'i). Mock:
`data:` URL (kichik) yoki soxta `https://storage.bobododa.uz/…` (katta).
Chegaralar `lib/attachments.ts`: `MAX_ATTACHMENT_BYTES` 15 MB, `MAX_ATTACHMENTS`
5, ruxsat etilgan MIME/kengaytmalar. `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`,
`FILE_READ_FAILED`. **`URL.createObjectURL` / `blob:` TAQIQLANGAN.**

### 3.12 `paymentsService : PaymentsService`

| Metod | Argument | Qaytadi | Izoh |
|---|---|---|---|
| `fundContract(id, method)` | `id, PaymentMethod` | **`FundResult`** (union — quyida) | `PAYMENTS_PAUSED`. **v1 tarmoqlari: Payme · Click · wallet (ichki balans).** Karta ekvayring alohida YO'Q (Payme/Click qoplaydi); qo'lda bank o'tkazma — v1.1. `wallet` → sinxron `{ kind: 'funded', contract }`; `payme`/`click` → `{ kind: 'redirect', paymentId, url }`. Contract to'lov tasdiqlanmaguncha `PENDING_PAYMENT` — return URL uni `ACTIVE` qilmaydi, faqat tasdiqlangan callback/polling qiladi | ✅ **ADR-03** |
| `fundMilestone(contractId, milestoneId, method?)` | — | — | **Chegaradan olib tashlanadi** — to'liq-oldindan model uni ishlatmaydi (UI ham chaqirmaydi) | ✅ **ADR-03** |
| `getBalance()` | — | `number` | Xaridorning qaytgan-escrow balansi (`sb2_balances`) |
| `getCards()` | — | `PaymentCard[]` | `{ id, userId, type, last4, holderName, expiry, createdAt }` — TO'LIQ RAQAM YO'Q |
| `addCard(input)` | `{ number, holderName, expiry }` | `PaymentCard` | `INVALID_CARD`, `INVALID_EXPIRY`, `INVALID_HOLDER`, `CARD_EXISTS`, `CARD_LIMIT` (5). `detectCardType`: Uzcard 8600 / Humo 9860 / Visa 4 / Mastercard 51–55·2221–2720 |
| `removeCard(id)` | `string` | `void` | |
| `withdrawEarnings(destination, amount?)` | `Destination, number?` | `WithdrawalRequest` | Mutaxassis daromadi → admin tasdig'iga so'rov. `NO_BALANCE`, `BELOW_MIN_PAYOUT`, `CARD_NOT_FOUND`, `INVALID_BANK_ACCOUNT` |
| `withdrawBalance(destination, amount?)` | `Destination, number?` | `WithdrawalRequest` | Xaridor balansi → admin tasdig'iga so'rov |
| `getWithdrawnTotal()` | — | `number` | Mutaxassisning yechilgan jami (`sb2_withdrawn`) |
| `getPendingWithdrawalTotal()` | — | `number` | "Band" summa (`kutilmoqda`+`korib_chiqilmoqda` so'rovlar) |
| `listMyWithdrawalRequests()` | — | `WithdrawalRequest[]` | Holatni kuzatish |

`Destination = string \| { type: "card", cardId } \| { type: "bank_account", bankAccount: BankAccountDetails }`.
`PaymentMethod` (v1 amaldagilar) = `"payme" \| "click" \| "balans"` (= wallet).
Qolganlari (`karta`, `rossiya_karta`, `kaspi_kz`, `visa_mastercard_intl`, `b2b`)
v1 da qabul qilinmaydi (`FEATURE_DISABLED`).

**Yangi qaytish tipi** (`FundResult`, `lib/api/contracts.ts` ga qo'shiladi):

```ts
type FundResult =
  | { kind: 'funded';   contract: Contract }              // walletdan — sinxron
  | { kind: 'redirect'; paymentId: string; url: string }  // Payme / Click
```

**Frontend'da kerak bo'ladigan minimal o'zgarish (adapter + 2–3 ekran):**
1. `fundContract` chaqiradigan joyda `kind` bo'yicha shoxlanish.
2. Yangi sahifa `/payment/return?paymentId=…` — "tekshirilmoqda"; `GET /payments/:id`
   ni 2 s da bir marta, 60 s davomida so'raydi, keyin "keyinroq tekshiring".
   Callback foydalanuvchi qaytishidan OLDIN ham, KEYIN ham kelishi mumkin —
   ikkalasi ham `PaymentIntent` ni bir xil idempotent yo'l bilan yangilaydi.

### "Yechish mumkin balans" — yangi endpoint ✅ **ADR-08**

`GET /wallet/balance` → `{ available, pendingClearance, inEscrow, currency }`
(hammasi butun so'm). Ledger'dan hisoblanadi. `pendingClearance` — to'lov
o'tgan, lekin ushlab turish muddati (sozlanadigan, boshlang'ich 3 kun)
tugamagan. `daromad`/`xarajatlar` client-side hisoblashdan shu endpoint'ga
o'tadi. `getBalance` / `getWithdrawnTotal` / `getPendingWithdrawalTotal` shu
javobdan hosil qilinadi (yoki adapter shu 3 tasini `GET /wallet/balance` ga
map qiladi).

### 3.13 `messagesService : MessagesService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `list(threadId)` | `string` | `Message[]` — egalik: `isThreadParticipant` |
| `listMine()` | — | `Message[]` (inbox) |
| `send(threadId, body, image?, attachments?)` | `id, string, string?, { images?: string[], files?: DeliverableFile[] }?` | `Message` — `EMPTY_MESSAGE`, `CIRCUMVENTION_DETECTED` (CLAUDE.md bo'yicha) |
| `getReadStatus()` | — | `Record<threadId, ISO>` — joriy viewer oxirgi o'qigan vaqti |
| `markRead(threadId)` | `string` | `void` |

> **`threadId` polimorf:** `contractId` YOKI `offerId` YOKI `proposalId`.
> `Message.contractId` maydoni aslida "threadId". **Q27.**

### 3.14 `notificationsService : NotificationsService`

| Metod | Qaytadi |
|---|---|
| `list()` | `AppNotification[]` — `{ id, userId, kind, messageKey, params?, href, read, createdAt }` |
| `markRead(id)` | `void` |
| `markAllRead()` | `void` |

`AppNotification.messageKey` — i18n kaliti (`ntf.milestoneAccepted`),
`params` bilan client render qiladi. `href` — ichki yo'l (`safeHref`).
`kind: "elon"\|"taklif"\|"bosqich"\|"xabar"\|"tolov"\|"tizim"`. Katalog — §6.

### 3.15 `reviewsService : ReviewsService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `listMine()` | — | `Review[]` (mutaxassis) |
| `getForContract(contractId)` | `string` | `Review \| null` (egalik: tomonlar) |
| `create(contractId, rating, comment)` | `string, number(1–5 butun), string` | `Review` — faqat buyer, shartnoma `yakunlangan`, `ALREADY_REVIEWED`. `SellerProfile.rating/reviewCount/badge` qayta hisoblanadi |

> Bir tomonlama (buyer→seller), darhol ko'rinadigan. Prompt "ikki tomonlama,
> ko'r-ko'rona" istaydi → **Q19.**

### 3.16 `disputesService : DisputesService`

| Metod | Argument | Qaytadi |
|---|---|---|
| `getForContract(contractId)` | `string` | `Dispute \| null` |
| `open(contractId, input)` | `string, Pick<Dispute,"reason"\|"description"\|"evidence">` | `Dispute` — shartnoma `faol` → `nizo`; `NOT_ALLOWED`, `ALREADY_EXISTS`, `INVALID_INPUT` |
| `withdraw(contractId)` | `string` | `void` — faqat ochgan tomon, faqat `ochiq` holat; shartnoma `faol` ga qaytadi |

`Dispute.reason = "scope"\|"quality"\|"deadline"\|"payment"\|"communication"\|"other"`.
`evidence: string[]` (URL yoki data-URL). Admin arbitraji — §4.

### 3.17 `verificationService : VerificationService` (KYC)

| Metod | Argument | Qaytadi |
|---|---|---|
| `getMine()` | — | `VerificationRecord \| null` |
| `submit(input)` | `Omit<VerificationRecord, "userId"\|"status"\|"submittedAt"\|"rejectionReason">` | `VerificationRecord` — `INVALID_INPUT` (18+, `legalName`, ≥2 hujjat) |

`VerificationRecord`: `{ userId, status, country, documentType, legalName,
birthDate, documents: string[] (base64 data:image, ~≤1 MB, 2–3 ta),
submittedAt?, reviewedAt?, rejectionReason? }`.

### 3.18 `supportService : SupportService` (ichki chipta)

| Metod | Argument | Qaytadi |
|---|---|---|
| `listMine()` | — | `SupportTicket[]` |
| `listReplies(ticketId)` | `string` | `SupportReply[]` — egalik `FORBIDDEN` |
| `create(input)` | `Pick<SupportTicket,"topic"\|"subject"\|"message">` | `SupportTicket` — `INVALID_INPUT` |

`SupportTicket.topic = "tolov"\|"shartnoma"\|"nizo"\|"hisob"\|"texnik"\|"boshqa"`.
`status = "ochiq"\|"javob_berildi"\|"yopilgan"`.

### 3.19 `supportRequestService : SupportRequestService` (haqiqiy backend)

| Metod | Argument | Qaytadi |
|---|---|---|
| `submit(input)` | `SupportRequestInput & { userId? }` | `void` |

**Bu YAGONA haqiqatan tarmoqqa chiqadigan service.** `POST /api/support`
(`app/api/support/route.ts`, Node runtime) → Telegram Bot API. Muhit
o'zgaruvchilari: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SUPPORT_CHAT_ID`. Xatolar:
`VALIDATION` (400), `RATE_LIMITED` (429, 10 min / 5), `SERVER_MISCONFIGURED`
(500), `TELEGRAM_FAILED`/`NETWORK` (502). **✅ Backend'ga ko'chiriladi** —
`SupportService` ichiga birlashtiriladi, Telegram xabari `OutboxEvent` orqali.

### 3.20 `feedbackService` (`lib/feedback.ts` — chegaradan tashqarida)

Sahifa fikr-mulohaza vidjeti (`components/shared/PageFeedbackWidget.tsx`).
Alohida `localStorage` store (`sb_page_feedbacks`), `@/lib/api` da EMAS.
`list()`, `submit({type, message, pageUrl, pageTitle?})`, `updateStatus(id,
status, adminNote?)`, `delete(id)`, `getStats()`. **✅ Backend'ga kiritiladi**
(`PageFeedback` modeli, admin `reports`/`settings` ostida ko'rinadi).

### 3.21 Cross-cutting

| Eksport | Hozir | Backend'da |
|---|---|---|
| `DATA_CHANGED_EVENT` | `write()` dan keyin brauzer `CustomEvent` — admin layout + feedback tinglaydi | **v1: polling** (ADR-07). Adapter bu eventni ichki timer bilan taqlid qiladi yoki UI shunchaki interval bilan qayta o'qiydi |
| `resetDemoData()` | Barcha `sb2_*` kalitni tozalab qayta seed | Prod'da olib tashlanadi |
| `NEXT_PUBLIC_DEMO_WORKSPACE` | `=1` bo'lsa har yangi hisobga tayyor ish maydoni (3 shartnoma, 7 bosqich, 2 karta, 3 xizmat, 4.9 reyting) | `ensureUserData()` butunlay o'chiriladi — server hech qachon yo'q yozuv ixtiro qilmaydi |

---

## 4. Admin servicelari (`lib/api/admin.ts`)

Adapter: `guard()` (SYNC) / `asyncGuard()` (SYNC mock → async chegara) /
`guardAsync()` (allaqachon async). **FAQAT 4 tasi SYNC** qoladi (sessiya
snapshot'i): `getAdminSession`, `getCurrentAdmin`, `hasPermission`, `adminLogout`.

### 4.1 Sessiya / huquq

| Metod | Qaytadi | Izoh |
|---|---|---|
| `getAdminSession()` **(SYNC)** | `AdminSession \| null` | `{ adminId, role, expiresAt }`, 8 soat |
| `getCurrentAdmin()` **(SYNC)** | `AdminAccount \| null` | |
| `hasPermission(p)` **(SYNC)** | `boolean` | 16 huquqdan biri |
| `adminLogout()` **(SYNC)** | `void` | |
| `adminLogin(email, password, expectedRole?)` | `Promise<AdminSession>` | `INVALID_CREDENTIALS`. `expectedRole` — `/admin/kirish` vs `/rahbariyat/kirish` |
| `getAdminAccounts()` | `AdminAccount[]` | |
| `setAdminActive(id, active)` | `AdminAccount[]` | super-admin; `SELF_LOCK` |
| `addAdmin(input)` | `AdminAccount` | super-admin; `DUPLICATE`, `WEAK_PASSWORD` |
| `updateAdminAccount(id, input)` | `AdminAccount[]` | super-admin; `SELF_LOCK`, `NOT_FOUND` |

`AdminRole = "super_admin"\|"operations"\|"finance"\|"support"\|"trust_safety"\|"kyc_reviewer"\|"admin"`.
`AdminPermission` (16): `dashboard, users, services, jobs, orders, kyc, disputes,
payments, reports, appeals, reviews, support, categories, settings, audit, admins`.

### 4.2 O'qish

| Metod | Qaytadi | Izoh |
|---|---|---|
| `getAdminData()` | `AdminData` | **@deprecated** — HAMMA qatorni qaytaradi. Faqat dashboard + `sozlamalar` + `kategoriyalar` ekranlari chaqiradi (**Q32**) |
| `getAuditEvents()` | `AuditEvent[]` | |
| `getInternalNotes(targetId)` | `InternalNote[]` | |
| `getTicketConversation(ticketId)` | `TicketMessage[]` | |
| `adminGlobalSearch(query)` | `SearchResultItem[]` | ≥2 belgi, ≤15 natija, 7 domen bo'ylab |

### 4.3 Navbatlar (server tomonida filtr + OFFSET sahifalash)

Har biri `(query: AdminQueueQuery = {}) → AdminPage<T>`.
`AdminQueueQuery = { page?, perPage? (≤100), search?, status?, category?, severity? }`.
`AdminPage<T> = { items: T[], page, perPage, total, totalPages, facets: Record<string, number> }`.
**Fasetlar `status` filtridan OLDIN hisoblanadi** (`_all`, `role:`, `severity:`
prefiks; `amountSum`, `ratingSum`, `proposals` yig'indilar) — **Q33.**

| Metod | Element tipi | Huquq |
|---|---|---|
| `listUsersQueue` | `AdminUserRow` (= `User` + `moderationStatus` + `kycStatus`) | `users` |
| `listServicesQueue` | `Service` | `services` |
| `listJobsQueue` | `Job` | `jobs` |
| `listContractsQueue` | `Contract` | `orders` |
| `listVerificationsQueue` | `AdminVerificationRow` (= `VerificationRecord` + `userName` + `userPhone`) | `kyc` |
| `listDisputesQueue` | `AdminDisputeRow` (= `Dispute` + `contractTitle` + `buyerName` + `sellerName`) | `disputes` |
| `listWithdrawalsQueue` | `WithdrawalRequest` | `payments` |
| `listTransactionsQueue` | `TransactionRecord` | `payments` |
| `listTicketsQueue` | `AdminTicketRow` (= `SupportTicket` + `userName`) | `support` |
| `listReportsQueue` | `TrustReport` | `reports` |
| `listAppealsQueue` | `UserAppeal` | `appeals` |
| `listReviewsQueue` | `Review` | `reviews` |
| `listAuditQueue` | `AuditEvent` | `audit` |
| `listB2bPendingContracts` | `Contract` (bank to'lovi kutilayotgan) | `payments` |
| `getAdminCounters()` | `AdminCounters` | har qanday admin — dashboard KPI + sidebar badge; `escrowTotal/payoutsTotal/commissionTotal` ham |

### 4.4 Detal o'quvchilar

`getContractMilestones(contractId) → Milestone[]` ·
`getDisputeContext(contractId) → { contract, milestones }` ·
`getUserDetail(userId) → { user, contracts, services, jobs, verifications, moderation }` ·
`findUserById / findServiceById / findContractById / findJobById /
findVerificationByUserId / findTicketById / findDisputeById` (global qidiruv
deep-link uchun — ID bo'yicha bitta yozuv).

### 4.5 Mutatsiyalar

**Foydalanuvchi moderatsiyasi** (`users` huquqi):
`suspendUser(userId, reason, durationDays: number\|null)` ·
`unsuspendUser(userId)` · `blockUser(userId, reason)` ·
`deactivateUser(userId)` · `softDeleteUser(userId)` ·
`adminModerateKYC(userId, "approve"\|"reject", reason?)` (`kyc` huquqi;
`REASON_REQUIRED` ≥5 belgi; bildirishnoma) ·
`adminModerate(kind, id, { outcome?, note? })` (umumiy dispatcher).

**Bozor moderatsiyasi:**
`closeJobAsAdmin(jobId, reason)` (`jobs`; `REASON_REQUIRED`; faol takliflar
avto-rad + bildirishnoma) ·
`setServiceStatus(serviceId, status, reason?)` (`services`; `ALREADY_PROCESSED`) ·
`deleteReview(reviewId)` (`reviews`; `removeReviewFromProfile` — reyting qayta hisoblanadi) ·
`updateTrustReport(reportId, "investigating"\|"resolved"\|"dismissed", note, userAction?)` (`reports`) ·
`handleUserAppeal(appealId, "accepted"\|"rejected", note)` (`appeals`; qabul → `unsuspendUser`).

**Arbitraj:**
`forceCloseContract(contractId, "refund"\|"payout"\|"split", notes, splitAmount?)`
(`disputes` YOKI `payments`). FAQAT escrow'dagi (`mablaglangan`/`topshirildi`/
`ozgartirish_soraldi`) bosqichlarni taqsimlaydi: `refund` → xaridor balansi +
bosqichlar `kutilmoqda`; `payout`/`split` → `qabul_qilindi`, `split` `totalAmount`
ni kamaytiradi. `DISPUTE_NOT_FOUND`, `INVALID_AMOUNT`. **Q17.**

**Yordam:** `replyToTicket(ticketId, replyText, newStatus?)` (`support`;
`REPLY_REQUIRED`) · `closeTicket(ticketId, note?)`.

**Moliya** (`payments` huquqi):
`approveWithdrawal(requestId)` (`ALREADY_PROCESSED`; `sb2_withdrawn` yoki
`sb2_balances` KAMAYTIRADI; `INSUFFICIENT_BALANCE`; tranzaksiya + bildirishnoma) ·
`rejectWithdrawal(requestId, reason)` (`REASON_REQUIRED`) ·
`reviewWithdrawal(requestId)` (`kutilmoqda` → `korib_chiqilmoqda`) ·
`approveB2bPayment(contractId)` (`NOT_PENDING`; bosqichlar `mablaglangan`,
shartnoma `faol`) · `rejectB2bPayment(contractId, reason)` ·
`reverseTransaction(txId, reason)` (super-admin; `ALREADY_CANCELLED`; teskari yozuv).

**Tizim:**
`saveCategory(category: CategoryManagementItem)` (`categories`) ·
`toggleCategoryActive(categoryId)` (`categories`) ·
`updatePlatformSetting(key, value)` (super-admin; `READ_ONLY` bloklangan
kalitlar; `NOT_FOUND`, `VALIDATION`) ·
`addInternalNote(targetId, targetType, text)` (`VALIDATION`) ·
`addAudit(action, target, details?, prev?, next?)`.

---

## 5. Xato taksonomiyasi (`lib/api/errors.ts`)

`ApiError { code: ApiErrorCode, message, status, fieldErrors?, retryable, cause? }`.

`ApiErrorCode` = `UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | DELETED | EXPIRED |
CONFLICT | VALIDATION | INVALID_TRANSITION | PAYMENTS_PAUSED | FEATURE_DISABLED |
BELOW_MINIMUM | RATE_LIMITED | NETWORK | STORAGE_FULL | UNKNOWN`.

**Server javobi shakli** (`ApiErrorBody`): `{ code?: string (LEGACY kaliti),
message?: string (log uchun), fieldErrors?: Record<string,string> }`.
`toApiError()` tartibi: (1) server bergan `code` → LEGACY jadval, (2) HTTP
status → `STATUS_CODES`, (3) qolgani → `UNKNOWN` + `retryable: status>=500`.

**HTTP status ↔ kod:** 400/422→`VALIDATION`, 401→`UNAUTHENTICATED`,
403→`FORBIDDEN`, 404→`NOT_FOUND`, 409→`CONFLICT`, 410→`DELETED`,
429→`RATE_LIMITED`, 503→`PAYMENTS_PAUSED`, 507→`STORAGE_FULL`.

### 5.1 LEGACY_CODES — server SHU kod satrlarini SHU status bilan qaytarishi kerak

`NO_SESSION/INVALID_CREDENTIALS/INVALID_CURRENT_PASSWORD` (401) ·
`FORBIDDEN/NOT_ALLOWED/ACCOUNT_BLOCKED` (403) ·
`NOT_FOUND/USER_NOT_FOUND/CARD_NOT_FOUND/DISPUTE_NOT_FOUND` (404) ·
`BAD_STATE` (409→`INVALID_TRANSITION`) ·
`DUPLICATE/DUPLICATE_OFFER/DUPLICATE_PROPOSAL/ALREADY_EXISTS/ALREADY_REVIEWED/
ALREADY_PROCESSED/REVISION_LIMIT_REACHED/PHONE_EXISTS/CARD_EXISTS/CARD_LIMIT/
ACTIVE_CONTRACTS/HAS_SUBMITTED_WORK/SELF_LOCK/READ_ONLY` (409) ·
`VALIDATION/INVALID_INPUT/INVALID_AMOUNT/INVALID_NAME/INVALID_HOLDER/INVALID_DATE/
INVALID_CODE/WEAK_PASSWORD/EMPTY_MESSAGE/COMMENT_REQUIRED/REASON_REQUIRED/
REPLY_REQUIRED/TOO_MANY_MILESTONES/INSUFFICIENT_BALANCE/NO_BALANCE/
FILE_TOO_LARGE/FILE_TYPE_NOT_ALLOWED/FILE_READ_FAILED` (422) ·
`BELOW_MIN_PAYOUT` (422→`BELOW_MINIMUM`) ·
`PAYMENTS_PAUSED` (503, retryable) ·
`OFFERS_DISABLED/REGISTRATION_PAUSED/CATEGORY_DISABLED` (503→`FEATURE_DISABLED`) ·
`STORAGE_FULL` (507).

### 5.2 GAP kodlari — ✅ **backend manba** (ADR: Q43)

`CIRCUMVENTION_DETECTED` · `INVALID_CARD` · `INVALID_EXPIRY` ·
`INVALID_BANK_ACCOUNT` · `ALREADY_FUNDED` · `NOT_PENDING` · `ALREADY_CANCELLED`.

Backend taksonomiyasi bularni o'z ichiga oladi, OpenAPI'ga chiqaradi; frontend
`lib/api/errors.ts` **shu OpenAPI'dan generatsiya qilinadi** (qo'lda ikki joyda
saqlanmaydi). Kod→HTTP status→`retryable` xaritasi ham OpenAPI'da.
`CIRCUMVENTION_DETECTED` — 409 (`CONFLICT`), `retryable: false`;
`INVALID_CARD`/`INVALID_EXPIRY`/`INVALID_BANK_ACCOUNT` — 422 (`VALIDATION`);
`ALREADY_FUNDED`/`NOT_PENDING`/`ALREADY_CANCELLED` — 409 (`CONFLICT`).

---

## 6. Bildirishnoma `messageKey` katalogi

Server SHU kalitlarni (+ `params`) chiqarishi kerak, rendered matn EMAS.

| messageKey | Kim oladi | params |
|---|---|---|
| `ntf.newOffer` | mutaxassis | `title` |
| `ntf.offerAccepted` | xaridor | `title` |
| `ntf.offerDeclined` | xaridor | `title` |
| `ntf.offerWithdrawn` | mutaxassis | `title` |
| `ntf.newProposal` | xaridor | `title` |
| `ntf.proposalInterview` | mutaxassis | `title` |
| `ntf.proposalRejected` | mutaxassis | `title` |
| `ntf.hired` | mutaxassis | `title` |
| `ntf.newContract` | mutaxassis | `title` |
| `ntf.contractSigned` | qarshi tomon | `title`, `role` |
| `ntf.contractFunded` | mutaxassis + xaridor | `title` |
| `ntf.milestoneFunded` | mutaxassis | `title` |
| `ntf.milestoneSubmitted` | xaridor | `title` |
| `ntf.milestoneAccepted` | mutaxassis | `title` |
| `ntf.milestoneApproved` | mutaxassis | `title` |
| `ntf.milestoneAutoAccepted` | ikkala tomon | `title` |
| `ntf.revisionRequested` | mutaxassis | `title` |
| `ntf.closeRequested` | xaridor | `title` |
| `ntf.contractCompleted` | ikkala tomon | `title` |
| `ntf.contractCancelled` | qarshi tomon | `title` |
| `ntf.refundIssued` | xaridor | `amount`, `title` |
| `ntf.newMessage` | qarshi tomon | `name` |
| `ntf.newReview` | mutaxassis | `rating` |
| `ntf.disputeOpened` | qarshi tomon | `title` |
| `ntf.disputeWithdrawn` | qarshi tomon | `title` |
| `ntf.disputeResolved` | ikkala tomon | `title`, `amount` |
| `ntf.kycApproved` | foydalanuvchi | — |
| `ntf.kycRejected` | foydalanuvchi | `reason` |
| `ntf.withdrawalApproved` | foydalanuvchi | `amount` |
| `ntf.withdrawalRejected` | foydalanuvchi | `reason` |
| `ntf.jobClosedByAdmin` | xaridor | `title`, `reason` |
| `ntf.servicePaused` / `ntf.serviceRestored` | mutaxassis | `title`, `reason` |
| `ntf.supportReplied` | foydalanuvchi | `subject` |
| `ntf.b2bPending` / `ntf.b2bRejected` | tomonlar | `title`, `reason?` |
| `ntf.newMatchingJob` | mutaxassis | `title` *(kelajakda)* |

---

## 7. Holat mashinalari (`lib/api/state-machines.ts` — UI + server bir manba)

`StateMachine<S> = { initial, terminal: S[], transitions: { from, to, actors:
Actor[], preconditions?, postconditions? }[] }`. `Actor = "buyer"|"seller"|"admin"|"system"`.
Noto'g'ri o'tish → `assertTransition` `Error("BAD_STATE")` (→ 409 `INVALID_TRANSITION`).

| Mashina | Holatlar (o'zbekcha) | Prompt'dagi ekvivalent (inglizcha) |
|---|---|---|
| `contractMachine` | `imzolangan → faol → yakunlangan` \| `bekor_qilingan` \| `nizo` (↔ `faol`) | Contract: DRAFT→PENDING_PAYMENT→ACTIVE→DELIVERED→COMPLETED \| CANCELLED \| DISPUTED |
| `milestoneMachine` | `kutilmoqda → mablaglangan → topshirildi → qabul_qilindi`; `topshirildi ↔ ozgartirish_soraldi` | Milestone: PENDING→FUNDED→IN_PROGRESS→SUBMITTED→APPROVED→RELEASED \| REVISION_REQUESTED \| DISPUTED |
| `proposalMachine` | `yuborilgan → korib_chiqilmoqda → suhbat → yollandi` \| `rad_etildi` \| `qaytarib_olingan` | Proposal: SENT→VIEWED→SHORTLISTED→ACCEPTED \| REJECTED \| WITHDRAWN \| EXPIRED |
| `offerMachine` | `yuborilgan → qabul_qilindi` \| `rad_etildi` \| `bekor_qilingan` | *(prompt'da yo'q — A yo'l)* |
| `jobMachine` | `ochiq → yopilgan` | Job: DRAFT→OPEN→IN_PROGRESS→CLOSED \| CANCELLED \| EXPIRED (**boyroq** — Q46) |
| `paymentMachine` | `created → pending → authorized → captured` \| `failed` \| `refunded` \| `cancelled` | Payment: INITIATED→PENDING→AUTHORIZED→PAID \| FAILED \| REFUNDED \| PARTIALLY_REFUNDED |
| `disputeMachine` | `ochiq → korib_chiqilmoqda → hal_qilindi` (+ `ochiq → hal_qilindi`) | Dispute: OPENED→UNDER_REVIEW→EVIDENCE_REQUESTED→RESOLVED_* \| WITHDRAWN |
| `reviewMachine` | `eligible → submitted → published` \| `hidden` | *(prompt: two-sided blind — Q19)* |
| `notificationMachine` | `unread → read` \| `archived` | — |
| — | — | **KYC** (Q44): NOT_STARTED→SUBMITTED→UNDER_REVIEW→APPROVED \| REJECTED \| EXPIRED — mock'da `boshlanmagan/korib_chiqilmoqda/tasdiqlangan/rad_etilgan` |
| — | — | **Payout** (Q29): REQUESTED→APPROVED→PROCESSING→SENT→CONFIRMED — mock'da `WithdrawalStatus` (`kutilmoqda/korib_chiqilmoqda/tasdiqlangan/rad_etilgan`) + `PayoutStatus` |

---

## 8. Qarorlar holati

> Barcha Bosqich-0 savollari `docs/02-decisions.md` da hal qilindi (ADR-01…08
> + qisqa javoblar). Quyida — yakuniy holat va Bosqich 2+ ga qoldirilganlar.

### Hal qilingan (ADR)

| Savol | Qaror | ADR |
|---|---|---|
| Enum wire formati (Q5) | API inglizcha `UPPER_SNAKE`; `lib/api/wire-enums.ts` adapteri map qiladi (exhaustive, test bilan) | **ADR-02** |
| `User.role` (Q49) | DB `roles Role[]` + `Session.activeRole`; API `{ role, availableRoles }`; admin — alohida `StaffMember` | **ADR-04** |
| Pul birligi (Q1/Q2/Q3) | DTO butun so'm; DB/ledger `BigInt` tiyin; floor yaxlitlash, qoldiq → `PLATFORM_REVENUE`; `feeRateBps` `Contract` da snapshot; API hisoblangan `feeAmount/netAmount` beradi | **ADR-01, ADR-05** |
| `fundContract` (Q11/Q12) | v1: Payme/Click/wallet; `FundResult` union (`funded` \| `redirect`); `fundMilestone` olib tashlanadi; return-page polling | **ADR-03** |
| Pagination (Q6) | Aralash — kursorli (o'sadigan ro'yxatlar) + offsetli (admin, katalog) | **ADR-06** |
| Realtime (Q7) | v1: polling (3 s / 15 s), WebSocket yo'q | **ADR-07** |
| Sharhlar (Q19) | Ikki tomonlama, ko'r-ko'rona, 14 kun oyna | qisqa javob |
| i18n (Q20/Q21) | Platforma kontenti 3 tilda; foydalanuvchi kontenti tarjima qilinmaydi + `lang` maydoni; `Skill`/`Category` — entity | qisqa javob |
| "Yechish mumkin balans" (Q30) | `GET /wallet/balance` → `{ available, pendingClearance, inEscrow }`; ledger'dan | **ADR-08** |
| `getAdminData()` (Q32) | Ko'chiriladi, eski metod o'chiriladi; ikkita parallel yo'l qolmaydi | qisqa javob |
| Fayllar (Q24) | Barchasi presigned S3; KYC — alohida bucket, TTL 5 daq, har o'qish AuditLog; server bayt proxy qilmaydi | qisqa javob |
| GAP kodlari (Q43) | Backend manba; frontend `errors.ts` OpenAPI'dan generatsiya | §5.2 |
| `feedbackService` / `supportRequestService` (Q42) | Ikkalasi backend'ga kiritiladi | §3.19–3.20 |

### Bosqich 2+ ga qoldirildi

- **`register` semantikasi:** darhol `Session` (frontend hozirgi kutgani) yoki
  `register`→OTP→`verify`→token. Bosqich 2 (Auth) boshida hal qilinadi;
  `User`/`Session`/`RefreshToken` ikkalasini ham qo'llaydigan qilib loyihalanadi.
- **`fundMilestone` olib tashlash (ADR-03):** A5 tekshiruvida (2026-09-10)
  `fundMilestone` faqat adapter/mock qatlamida topildi — `lib/api/contracts.ts`
  (interfeys), `lib/api/client.ts` (delegatsiya), `lib/mock-api/index.ts`
  (mock). Hech qanday ekran chaqirmaydi. Bosqich 2 da real `paymentsService`
  yozilganda shu 3 joydan ham o'chiriladi. Chaqiruvchi ekran ro'yxati: **YO'Q**.
- **`rejectCloseContract` (Q16):** "yopish so'rovini rad etish" haqiqiy
  imkoniyatmi? Bosqich 4 (workroom) da aniqlanadi — hozir mock'da bor,
  interfeysda yo'q, UI chaqirmaydi.
- **`Job.status` (Q46):** 2-qiymatli (`OPEN`/`CLOSED`) yoki boyroq to'plam
  (`DRAFT/OPEN/IN_PROGRESS/CLOSED/CANCELLED/EXPIRED`). Bosqich 3 (Bozor).
- **`BuyerProfile`:** alohida jadval kerakmi (rating, completedContracts).
  Bosqich 3.
- **User-facing shikoyat / apellyatsiya (Q39/Q40):** v1.1. v1'da `Dispute`
  modelida `appealable` + `resolvedAt` hozirdan bor.
- **`responseTimeHours` (Q31):** haqiqiy (xabar vaqtlaridan) yoki statik.
  Bosqich 6 (Aloqa).
- **`ServicePackage` (Q22):** basic/standard/premium v1 da kerakmi. Bosqich 3.
