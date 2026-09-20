# 03 — Schema review (B blok)

> B1–B8 bo'yicha. B1–B7 — hozirgi (Bosqich 1) schema haqida. B8 — Bosqich
> 3–4 uchun **taklif** (tavsif, kod emas) — `docs/01-data-model.md` §5 dagi
> dastlabki eskizni ko'rib chiqadi va bir joyda (`PLATFORM_ESCROW` alohida
> hisob) undan ATAYLAB chetga chiqadi, sababi B8'da tushuntirilgan.

---

## B1 — To'liq schema

`backend/prisma/schema.prisma`, hozirgi holat (Bosqich 1 — identity + cross-cutting):

```prisma
// ─────────────────────────────────────────────────────────────────────────────
// Bobo&Doda backend — Prisma schema
//
// Bosqich 1: POYDEVOR. Bu migratsiya faqat identity + auth token infra +
// cross-cutting (audit / outbox / idempotency) modellarini kiritadi.
// Domen modellari (Service, Job, Contract, Milestone, Ledger, Dispute …) o'z
// bosqichlarida qo'shiladi — to'liq loyiha `docs/01-data-model.md` da.
//
// Qoidalar (`docs/02-decisions.md`):
//  • Enum'lar — inglizcha UPPER_SNAKE (ADR-02).
//  • Pul — BigInt tiyin (ADR-01)  → Bosqich 4.
//  • `version Int` — holatga ta'sir qiladigan har modelda (optimistic lock).
//  • Migratsiya faqat `prisma migrate` — qo'lda SQL / `db push` YO'Q.
//  • Birlamchi kalitlar — UUIDv7 (A1). Prisma `@default(uuid())` (v4) YO'Q;
//    ID `src/common/id/id.factory.ts` (`newId()` / `IdFactory`) da yasaladi,
//    service qatlami `data: { id: ids.next(), ... }` beradi. PG16 da native
//    `uuidv7()` yo'q — generatsiya ilova darajasida.
//  • Vaqt — hamma joyda `DateTime @db.Timestamptz(6)` (A3). `timestamp` YO'Q.
//  • DB rollari (A4): `url` = `bobododa_app` (runtime, kam huquq),
//    `directUrl` = `bobododa_migrator` (DDL/kengaytma/GRANT — `prisma migrate`).
// ─────────────────────────────────────────────────────────────────────────────

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  // Runtime — kam huquqli `bobododa_app` roli (append-only jadvallarga
  // UPDATE/DELETE yo'q, DB darajasida majburlangan).
  url       = env("DATABASE_URL")
  // `prisma migrate` / `db pull` — `bobododa_migrator` roli (DDL, CREATE
  // EXTENSION, GRANT). PrismaClient buni ISHLATMAYDI.
  directUrl = env("DATABASE_MIGRATION_URL")
}

// ── Enums ────────────────────────────────────────────────────────────────────

/// Marketplace roli. Bitta User bir vaqtda ham SELLER, ham BUYER bo'la oladi
/// (ADR-04). Faol rol JWT ichidagi `activeRole` da — bu yerda emas.
enum Role {
  SELLER
  BUYER
}

/// Admin/operator roli — marketplace `Role` dan ATAYLAB ajratilgan (ADR-04).
enum StaffRole {
  SUPER_ADMIN
  OPERATIONS
  FINANCE
  SUPPORT
  TRUST_SAFETY
  KYC_REVIEWER
  ADMIN
}

/// Admin panel huquqlari (RBAC). Har endpoint aniq bittasini talab qiladi;
/// default = deny.
enum StaffPermission {
  DASHBOARD
  USERS
  SERVICES
  JOBS
  ORDERS
  KYC
  DISPUTES
  PAYMENTS
  REPORTS
  APPEALS
  REVIEWS
  SUPPORT
  CATEGORIES
  SETTINGS
  AUDIT
  STAFF
}

/// Audit yozuvini kim yaratdi.
enum AuditActorType {
  USER
  STAFF
  SYSTEM
}

/// Outbox hodisasining yetkazish holati.
enum OutboxStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
}

// ── Identity ─────────────────────────────────────────────────────────────────

/// Marketplace foydalanuvchisi (buyer va/yoki seller).
model User {
  id           String  @id @db.Uuid
  phone        String  @unique
  passwordHash String
  fullName     String
  /// [SELLER], [BUYER], yoki ikkalasi. SELLER qo'shish → KYC talab qilinadi.
  roles        Role[]
  /// Avatar S3 obyekt kaliti (presigned URL orqali olinadi).
  avatarKey    String?
  email        String?

  // Onboarding holati — login'da sessiya qayerda to'xtagan bo'lsa tiklanadi.
  roleChosen  Boolean @default(false)
  profileDone Boolean @default(false)
  verified    Boolean @default(false)

  // Buyer / kompaniya qo'shimcha maydonlari.
  companyName String?
  industry    String?
  website     String?
  location    String?
  bio         String?

  // OAuth bog'lanishlari.
  telegramUsername String?
  telegramLinkedAt DateTime? @db.Timestamptz(6)
  googleLinkedAt   DateTime? @db.Timestamptz(6)

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)
  deletedAt DateTime? @db.Timestamptz(6)
  version   Int       @default(0)

  refreshTokens RefreshToken[]
  staffMember   StaffMember?

  @@index([createdAt])
  @@map("users")
}

/// Refresh token — DB'da saqlanadi (revocation uchun). Oilaviy reuse
/// detection: ishlatilgan token qayta kelsa butun `familyId` bekor qilinadi
/// (to'liq mantiq — Bosqich 2).
model RefreshToken {
  id           String    @id @db.Uuid
  userId       String    @db.Uuid
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// Argon2/SHA-256 hash — xom token DB'da SAQLANMAYDI.
  tokenHash    String    @unique
  familyId     String    @db.Uuid
  replacedById String?   @db.Uuid
  revokedAt    DateTime? @db.Timestamptz(6)
  userAgent    String?
  ip           String?
  expiresAt    DateTime  @db.Timestamptz(6)
  createdAt    DateTime  @default(now()) @db.Timestamptz(6)

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

/// Admin/operator hisobi. `userId` ixtiyoriy — staff ham marketplace
/// foydalanuvchisi bo'lishi mumkin, lekin IDENTITY alohida (ADR-04).
model StaffMember {
  id           String            @id @db.Uuid
  userId       String?           @unique @db.Uuid
  user         User?             @relation(fields: [userId], references: [id], onDelete: SetNull)
  fullName     String
  email        String            @unique
  passwordHash String
  role         StaffRole
  title        String
  permissions  StaffPermission[]
  isActive     Boolean           @default(true)
  mfaEnabled   Boolean           @default(false)
  lastLoginAt  DateTime?         @db.Timestamptz(6)
  createdAt    DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime          @updatedAt @db.Timestamptz(6)
  version      Int               @default(0)

  sessions StaffSession[]

  @@map("staff_members")
}

/// Admin sessiyasi — 8 soat (frontend `AdminSession`). JWT'dan alohida
/// server-side yozuv (majburiy logout uchun).
model StaffSession {
  id        String      @id @db.Uuid
  staffId   String      @db.Uuid
  staff     StaffMember @relation(fields: [staffId], references: [id], onDelete: Cascade)
  userAgent String?
  ip        String?
  expiresAt DateTime    @db.Timestamptz(6)
  revokedAt DateTime?   @db.Timestamptz(6)
  createdAt DateTime    @default(now()) @db.Timestamptz(6)

  @@index([staffId])
  @@index([expiresAt])
  @@map("staff_sessions")
}

// ── Cross-cutting infra ──────────────────────────────────────────────────────

/// Audit jurnali — HAR pul harakati va staff qarori bu yerga tushadi
/// (ADR: Q36). `AuditActorType.STAFF` yozuvlari admin panelidagi `AuditEvent`.
model AuditLog {
  id            String         @id @db.Uuid
  actorId       String?        @db.Uuid
  actorType     AuditActorType
  actorName     String
  /// Masalan "MILESTONE_ACCEPTED", "KYC_APPROVED", "PLATFORM_SETTING_CHANGED".
  action        String
  resourceType  String
  resourceId    String
  /// Bog'liq yozuv (masalan shartnoma id — bosqich audit'i uchun).
  contextId     String?
  previousState Json?
  newState      Json?
  ip            String?
  userAgent     String?
  requestId     String?
  createdAt     DateTime       @default(now()) @db.Timestamptz(6)

  @@index([resourceType, resourceId])
  @@index([actorId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

/// Outbox pattern — tashqi tizimga yuboriladigan hodisa DB tranzaksiyasi
/// ICHIDA yoziladi, alohida worker jo'natadi. Tranzaksiya ichida HTTP call
/// QILINMAYDI.
model OutboxEvent {
  id            String       @id @db.Uuid
  aggregateType String
  aggregateId   String
  eventType     String
  payload       Json
  status        OutboxStatus @default(PENDING)
  attempts      Int          @default(0)
  lastError     String?
  availableAt   DateTime     @default(now()) @db.Timestamptz(6)
  processedAt   DateTime?    @db.Timestamptz(6)
  createdAt     DateTime     @default(now()) @db.Timestamptz(6)

  @@index([status, availableAt])
  @@index([aggregateType, aggregateId])
  @@map("outbox_events")
}

/// Idempotentlik kaliti — pul harakati qiladigan HAR endpoint
/// `Idempotency-Key` header qabul qiladi. Bir xil (key, user, endpoint)
/// takrorlansa saqlangan javob qaytariladi.
model IdempotencyKey {
  id               String   @id @db.Uuid
  key              String
  userId           String?  @db.Uuid
  endpoint         String
  requestHash      String
  statusCode       Int?
  responseSnapshot Json?
  createdAt        DateTime @default(now()) @db.Timestamptz(6)
  expiresAt        DateTime @db.Timestamptz(6)

  @@unique([key, userId, endpoint])
  @@index([expiresAt])
  @@map("idempotency_keys")
}
```

(A4 rol/GRANT/REVOKE, A2 kengaytmalari — schema'da emas, `prisma/migrations/20260909232121_init/migration.sql` va `prisma/sql/roles.sql` da; `docs/RUNBOOK.md` §3.)

---

## B2 — Indekslar

| Model | Indeks | Qaysi so'rov | Ustun tartibi nega shunday |
|---|---|---|---|
| User | `phone @unique` | Login/OTP qidiruvi (`WHERE phone = ?`), ro'yxatdan o'tishda `PHONE_EXISTS` tekshiruvi | yagona ustun |
| User | `@@index([createdAt])` | ⚠️ **hozircha hech qanday amalga oshirilgan so'rov ISHLATMAYDI** — Bosqich 1'da foydalanuvchi ro'yxati endpoint'i yo'q. Oldindan qo'yilgan: `docs/00-api-surface.md` §4.3 `listUsersQueue` (admin, Bosqich 3+) `ORDER BY createdAt DESC` bilan sahifalanadi — o'sha kelganda ishlaydi. Halol tan olaman: bu "kerak bo'lar" toifasiga kiradi, lekin ANIQ hujjatlashtirilgan kelajakdagi so'rovga mo'ljallangan, spekulyativ emas | — |
| RefreshToken | `tokenHash @unique` | **Eng ko'p chaqiriladigan so'rov butun modulda**: har `/auth/refresh` `WHERE tokenHash = ?` | yagona ustun |
| RefreshToken | `@@index([userId])` | `GET /me/sessions` (qurilmalar ro'yxati), "hammasidan chiqish" | yagona ustun |
| RefreshToken | `@@index([familyId])` | Reuse-detection: o'g'irlangan token qayta kelsa `UPDATE ... SET revokedAt=now() WHERE familyId=?` — BUTUN oilani bekor qilish | yagona ustun |
| RefreshToken | `@@index([expiresAt])` | GC/cleanup job (`DELETE WHERE expiresAt < now()`) | yagona ustun |
| StaffMember | `userId @unique` | 1:1 munosabat qidiruvi + "bitta User — ko'pi bilan bitta StaffMember" cheklovi | yagona ustun |
| StaffMember | `email @unique` | Staff login (`WHERE email = ?`) | yagona ustun |
| StaffSession | `@@index([staffId])` | "Mening sessiyalarim" / majburiy hammadan chiqarish | yagona ustun |
| StaffSession | `@@index([expiresAt])` | Sessiya GC | yagona ustun |
| AuditLog | `@@index([resourceType, resourceId])` | Admin "shu resurs uchun audit tarixi" (`WHERE resourceType='CONTRACT' AND resourceId=?`) | `resourceType` OLDIN: kam kardinallik (~10 tur) lekin **yolg'iz ham** so'raladi ("hamma CONTRACT audit hodisalari"); `resourceId` KEYIN — leftmost-prefix qoidasi bo'yicha shu indeks ikkala so'rovni ham qoplaydi, lekin `resourceId` YOLG'IZ so'ralsa ishlamaydi (bunday so'rov yo'q — har doim ikkalasi birga yoki faqat tur) |
| AuditLog | `@@index([actorId])` | "Bu admin/user nima qildi" tergov so'rovi | yagona ustun |
| AuditLog | `@@index([action])` | `listAuditQueue` filtri (masalan faqat `KYC_APPROVED`) | yagona ustun |
| AuditLog | `@@index([createdAt])` | Xronologik ro'yxat/sahifalash (admin audit navbati sukut tartibi) | yagona ustun |
| OutboxEvent | `@@index([status, availableAt])` | **Worker so'rovining o'zi**: `WHERE status='PENDING' AND availableAt<=now() ORDER BY availableAt LIMIT N FOR UPDATE SKIP LOCKED` | `status` OLDIN (tenglik, 4 qiymat), `availableAt` KEYIN (diapazon+saralash) — "tenglik diapazondan oldin" qoidasi |
| OutboxEvent | `@@index([aggregateType, aggregateId])` | Debug/kuzatuv: "shu shartnoma uchun outbox hodisalari yetkazildimi?" | `aggregateType` OLDIN (yolg'iz ham so'raladigan bo'lishi mumkin), `aggregateId` KEYIN |
| IdempotencyKey | `@@unique([key, userId, endpoint])` | Idempotentlik tekshiruvi — uchalasi HAR DOIM birga, aniq tenglik bilan so'raladi | tartib bu holatda ahamiyatsiz (uchalasi ham doim birga beriladi); `key` birinchi — eng yuqori kardinallik, o'qish qulayligi uchun |
| IdempotencyKey | `@@index([expiresAt])` | TTL tozalash (`DELETE WHERE expiresAt < now()`) | yagona ustun |

**Tanqidiy izoh (AuditLog).** To'rtta ALOHIDA bir-ustunli indeks (`resourceType+resourceId`, `actorId`, `action`, `createdAt`) — bu yozuv tezligiga narx: har `INSERT` 5 ta B-tree'ni (PK + 4) yangilaydi, `AuditLog` esa B7 bo'yicha eng tez o'sadigan jadvallardan biri. Bosqich 3+ da `listAuditQueue`/`listUsersQueue` kabi admin navbatlar REAL saralash bilan ishga tushganda (`ORDER BY createdAt DESC` deyarli har doim qo'shiladi), `actorId`/`action`'ni compound `[actorId, createdAt]`/`[action, createdAt]` ga aylantirishni ko'rib chiqish kerak — hozir ular yolg'iz, ya'ni "shu actor bo'yicha, vaqt tartibida" so'rovi indeks orqali FILTRLAYDI, lekin keyin ALOHIDA sort (filesort) qiladi. Hozir buni QILMADIM, chunki haqiqiy so'rov naqshi hali yo'q (Bosqich 1'da audit ro'yxati endpoint'i yo'q) — spekulyativ compound indeks qo'shish ham xato bo'lardi.

---

## B3 — `onDelete`

| Relation | `onDelete` | Nega |
|---|---|---|
| `RefreshToken.user → User` | `Cascade` | Sof autentifikatsiya artefakti, moliyaviy/audit qiymati YO'Q. User o'chirilsa (real `DELETE`, odatda faqat data-erasure so'rovida — B4) uning sessiya tokenlari ham ma'nosiz qoladi; ularni saqlashning hech qanday foydasi yo'q. |
| `StaffMember.user → User` | `SetNull` | StaffMember ALOHIDA identity (ADR-04) — marketplace User'ga bog'lanishi IXTIYORIY. User o'chirilsa, StaffMember (rol/huquq/audit izi bilan) YO'QOLMASLIGI kerak — faqat bog'lanish uziladi. |
| `StaffSession.staff → StaffMember` | `Cascade` | RefreshToken bilan bir xil mantiq: sof sessiya artefakti, StaffMember'ning O'ZI (kamdan-kam, `isActive=false` orqali emas, haqiqatan) o'chirilsa ortiqcha. |

**Qat'iy qoida — hozircha SINALMAGAN.** Bosqich 1'da pul/audit bilan bog'liq HECH QANDAY relation yo'q (Contract/Milestone/LedgerEntry hali mavjud emas). Bu qoidani endi, ular kelganda, oldindan yozib qo'yaman: **`Contract.buyerId`/`sellerId`, `Review.authorId`/`targetId`, `LedgerAccount.ownerId`, va HAR QANDAY moliyaviy FK — `onDelete: Restrict` (yoki umuman `onDelete` yozilmaydi, Prisma/Postgres sukuti `NO ACTION` — funksional jihatdan bir xil: FK buzilishiga yo'l qo'yilmaydi).** Bu SetNull/Cascade EMAS — chunki:
- `Cascade` — shartnoma tarixini o'chirib yuboradi (yuridik/moliyaviy talabga zid).
- `SetNull` — "kim bilan shartnoma tuzilgan edi?" savolini javobsiz qoldiradi (Contract.buyerId NULL bo'lib qolsa, `totalAmount`/`LedgerEntry` kimga tegishli ekani yo'qoladi).
- To'g'ri yechim — User HECH QACHON haqiqiy `DELETE` bilan o'chirilmaydi (agar unda birorta Contract/Review/LedgerAccount bo'lsa); buning o'rniga B4'dagi anonimlashtirish. `Restrict` bu qoidani DB darajasida MAJBURLAYDI (A4/F1 naqshi bilan bir xil falsafa: kod-darajasidagi niyat DB constraint bilan qo'llab-quvvatlanadi).

**Ijobiy kuzatuv.** `AuditLog.actorId` — bu ATAYLAB oddiy `String?`, User'ga FK EMAS. Ya'ni User o'chirilsa (yoki hatto jismonan o'chirilsa), audit yozuvlari hech qanday cascade xavfisiz — chunki cascade qiladigan FK umuman yo'q. Bu tasodif emas, konservativ dizayn: eng muhim, hech qachon yo'qolmasligi kerak bo'lgan jadval FK zanjiridan TASHQARIDA turibdi.

---

## B4 — Soft delete va unique konflikti

**Ssenariy:** foydalanuvchi akkauntini o'chiradi. Bir oydan keyin o'sha telefon raqami bilan qayta ro'yxatdan o'tmoqchi.

**Hozirgi schema bilan:** `phone @unique` GLOBAL cheklov — o'chirilgan qator ham raqamni band qilib turadi → qayta ro'yxatdan o'tish `PHONE_EXISTS` bilan bloklanadi. Bu haqiqatan Bosqich 2'ning birinchi haftasida chiqadigan bug.

### Tanlov: **variant 2 — anonimlashtirish, qator QOLADI**

Variant 1'ni (partial unique index `WHERE deletedAt IS NULL`) RAD ETAMAN: u FAQAT unique-konfliktni yechadi, lekin telefon raqami/ism o'chirilgan qatorda ABADIY ochiq matnda saqlanib qoladi — haqiqiy ma'lumot-himoyasi maqsadiga umuman xizmat qilmaydi, faqat "muammoni ko'rinmas qiladi". Ustiga, Prisma `@unique` bevosita partial index'ni qo'llab-quvvatlamaydi — qo'lda SQL migratsiya kerak bo'ladi (kod bazasi qoidasiga zid: "Migratsiya faqat `prisma migrate`").

"Sof" variant 3'ni (soft-delete'ni butunlay tashlab, faqat anonimlashtirish, `deletedAt`siz) ham RAD ETAMAN: `Contract`/`Review`/`LedgerAccount` baribir `User.id`ga ishora qilishda davom etadi (B3), ya'ni qator FIZIK hech qachon yo'qolmaydi — demak "akkaunt yopiqmi?" degan holatni QANDAYDIR maydon bildirishi SHART, `deletedAt`ni olib tashlash uni boshqa nom bilan qayta ixtiro qilishga olib keladi. Ustiga, `docs/01-data-model.md` §7'dagi `UserModeration.status` allaqachon `DELETED` qiymatini o'z ichiga oladi — ya'ni admin-moderatsiya modeli o'zi ham "o'chirilgan-lekin-mavjud" User holatini kutadi.

**Yakuniy dizayn — variant 2, aniqlashtirilgan:**

```
User.phone — anonimlashtirishda ustiga yoziladi: "deleted:<uuid>"
  (haqiqiy raqam SHU ZAHOTI bo'shaydi — global @unique buzilmaydi,
   chunki eski qator ENDI o'sha qiymatni USHLAMAYDI)
User.fullName/email/companyName/industry/website/bio/avatarKey/
  telegramUsername → tozalanadi (PII minimallashtirish)
User.passwordHash → ishlatib bo'lmaydigan sentinel (login imkonsiz)
User.deletedAt → hozirgi vaqt (holat belgisi, "qachon" javobi)

+ YANGI jadval (Bosqich 2/6):
DeletedUserArchive {
  id              String   @id @db.Uuid
  userId          String   @unique @db.Uuid   // FK YO'Q (Restrict/Cascade
                                               // kerak emas — bu jadval
                                               // hech kim tomonidan
                                               // referensiya qilinmaydi)
  originalPhone   String
  originalEmail   String?
  originalFullName String
  deletionReason  String   // self_service | staff_moderated | gdpr_request
  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  purgeAfter      DateTime @db.Timestamptz(6)  // rejalashtirilgan HAQIQIY
                                                // DELETE shu jadvaldan
}
```

`deleteAccount()` (Stage 2/6) oqimi: (1) `ACTIVE_CONTRACTS` guard (allaqachon hujjatlashtirilgan) → (2) `DeletedUserArchive` yozuvi (asl telefon/ism, `purgeAfter = now() + N kun`) → (3) `User` ustiga yozish (yuqoridagi anonimlashtirish) → (4) rejalashtirilgan job `purgeAfter` o'tgan `DeletedUserArchive` qatorlarini HAQIQIY o'chiradi (bu jadvalga FK yo'q — xavfsiz).

**Nega arxiv, nolga tushirish emas:** agar o'chirish so'ralgan zahoti barcha identifikatsion ma'lumot butunlay yo'q qilinsa, nizo/firibgarlik tergovi paytida (masalan kimdir nizo ochilishidan qochish uchun akkauntni o'chirsa) dalil yo'qoladi. Chegaralangan (masalan 90 kunlik) arxiv — KYC/DISPUTES huquqiga ega staff uchun so'rov bo'yicha ochiladigan — ikkala talabni ham qondiradi: darhol qayta ro'yxatdan o'tish IMKONIYATI va yaqin muddatli tergov ehtimoli.

---

## B5 — Nullable maydonlar

| Maydon | Nega `?` |
|---|---|
| `User.avatarKey` | Yuklanmagan — UI bosh harfli Avatar fallback'iga o'tadi |
| `User.email` | Ikkinchi darajali (auth — telefon), faqat ixtiyoriy bildirishnoma uchun |
| `User.companyName/industry/website` | Faqat xaridor/kompaniya profilida dolzarb, hatto xaridor uchun ham profil to'ldirish bosqichma-bosqich |
| `User.location/bio` | Ro'yxatdan o'tishda yig'ilmaydi — profil wizardida to'ldiriladi |
| `User.telegramUsername` / `telegramLinkedAt` / `googleLinkedAt` | Faqat mos OAuth bog'langan bo'lsa mavjud — o'zi "bog'langanmi" signali |
| `User.deletedAt` | NULL = faol; qiymat = soft-delete belgisi (B4) |
| `RefreshToken.replacedById` | Rotatsiyalanmagan (joriy) token uchun NULL; almashtirilganda o'sha keyingi tokenga ishora |
| `RefreshToken.revokedAt` | NULL = amaldagi; qiymat = chiqib ketish/reuse-detection/oila bekor qilinishi |
| `RefreshToken.userAgent` / `ip` | Ba'zi HTTP klientlar (curl, ba'zi proxy'lar) header yubormaydi |
| `StaffMember.userId` | ADR-04: staff MARKETPLACE hisobiga ega bo'lishi shart emas |
| `StaffMember.lastLoginAt` | Hali birinchi marta kirmagan yangi hisob uchun NULL |
| `StaffSession.userAgent` / `ip` | RefreshToken bilan bir xil sabab |
| `StaffSession.revokedAt` | NULL = faol; qiymat = majburiy chiqarilgan |
| `AuditLog.actorId` | `actorType=SYSTEM` uchun NULL (avtomatik jarayonda inson/staff yo'q) |
| `AuditLog.contextId` | Faqat kengroq ota-yozuvga (masalan bosqich → shartnoma) bog'liq hodisalar uchun to'ldiriladi |
| `AuditLog.previousState` | CREATE hodisasida "oldingi holat" yo'q |
| `AuditLog.newState` | (Kamdan-kam, deyarli hammasi append-only) o'chirish-uslubidagi hodisada "yangi holat" yo'q |
| `AuditLog.ip` / `userAgent` / `requestId` | SYSTEM-actor / fon job hodisalarida HTTP so'rov konteksti umuman yo'q |
| `OutboxEvent.lastError` | Birinchi yetkazish urinishi muvaffaqiyatli bo'lsa hech qachon to'ldirilmaydi |
| `OutboxEvent.processedAt` | NULL = hali yetkazilmagan; qiymat = worker tasdiqlagan |
| `IdempotencyKey.statusCode` | Asl so'rov HALI QAYTA ISHLANAYOTGANDA NULL — bu holat parallel takroriy so'rovlarga "band" signalini beradi |
| `IdempotencyKey.responseSnapshot` | Xuddi shu sabab — javob hali noma'lum |

---

## B6 — Denormal / hisoblanadigan maydonlar

Bosqich 1 schema'sida bironta ham yo'q (Contract/SellerProfile hali mavjud emas). Lekin `docs/01-data-model.md` §6 allaqachon to'liq ro'yxatni belgilagan — shu yerda savollarga javob beraman:

| Maydon | Turi | Qachon yangilanadi | Sinxronlash mexanizmi |
|---|---|---|---|
| `SellerProfile.rating`/`reviewCount`/`completedContracts`/`badge` | **saqlanadigan denorm** | `Review` PUBLISHED, staff `deleteReview`, `Contract→COMPLETED` | **Ilova darajasida, TRIGGER O'RNIGA QO'LDA chaqiriladigan yordamchi funksiya** (`applyNewReviewToProfile`/`removeReviewFromProfile`/`incrementCompletedContracts`), sharh/shartnoma yozuvi bilan **BITTA DB tranzaksiyasida** |
| `Job.proposalsCount` | denorm | Proposal yaratilganda +1, WITHDRAWN −1 | xuddi shu — bitta tranzaksiya |
| `Contract.buyerName`/`sellerName` | denorm (snapshot) | Yaratilganda; hisob o'chirilsa "O'chirilgan foydalanuvchi" (B4 bilan bog'liq!) | yozilishda bir marta, keyin o'zgarmaydi |
| `Contract.totalAmount` | denorm | = Σ milestone.amount; arbitraj SPLIT'da kamayadi | tranzaksiya ichida |
| `Contract.feeRateBps` | **snapshot** (hisoblanadigan emas) | Yaratilganda, `PlatformFeeConfig`dan | yozilishda bir marta |
| `Contract.paymentStatus` | derived CACHE | `PaymentIntent` o'zgarganda | tranzaksiya ichida |
| `SellerProfile.identityVerified`/`completionRate` | **HISOBLANADI (saqlanmaydi)** | har o'qishda | — |
| wallet `available`/`pendingClearance`/`inEscrow` | **HISOBLANADI** | har so'rovda, ledger'dan | — |
| admin counter/facet'lar, `Category.serviceCount` | agregat | har so'rovda | `COUNT`/`SUM ... GROUP BY` |

**Rekonsiliatsiya (hozir YO'Q — bo'shliq).** `rating`/`reviewCount`/`completedContracts` uchun HECH QANDAY davriy tekshiruv yo'q — agar bitta yordamchi funksiya chaqiruvi tashlab ketilsa (masalan yangi kod yo'lida), qiymat sekin-asta haqiqiy `Review`/`Contract` jadvalidan chetlashadi va HECH KIM buni sezmaydi. Bosqich 3/4'da qo'shishni tavsiya qilaman: davriy job (masalan haftalik) `SellerProfile.rating` ni `AVG(Review.rating) WHERE targetId=? AND status=PUBLISHED` bilan qayta hisoblab solishtiradi, farq bo'lsa ogohlantiradi (yoki avtomatik tuzatadi + `AuditLog` yozuvi).

**O'lchangan muammomi yoki oldindan optimallashtirishmi?** Halol javob — **aralash**. `identityVerified`/`completionRate`/wallet balansi — TO'G'RI hisoblanadi (ADR-08 aynan shuni talab qiladi: "balans hech qachon client-side/saqlangan ustun emas"). Lekin `rating`/`reviewCount`/`completedContracts`ni SAQLASH sof unumdorlik nuqtai nazaridan HALI O'LCHANGAN muammo EMAS — Bosqich 1-4 hajmida `AVG(rating) FROM reviews WHERE targetId=?` jonli so'rovi ham ishlagan bo'lardi. Ularni saqlashning haqiqiy asosi BOSHQA: (a) bozor RO'YXATI sahifasi N ta sotuvchini bir vaqtda ko'rsatadi — har biri uchun jonli agregat N+1 so'rov naqshiga aylanadi; (b) `badge` (`computeBadge`) ikkala qiymatni BIRGA talab qiladi va ro'yxat qatorida hisoblash qimmatga tushadi. Bundan tashqari, CLAUDE.md aynan shu to'rt maydon uchun **tarixiy xato**ni hujjatlashtiradi: "ilgari... 1 yulduzli sharh ham, 100 ta yakunlangan ish ham raqamga ta'sir qilmasdi" — ya'ni asl muammo unumdorlik emas, **noto'g'rilik** edi (umuman yangilanmasdi). Xulosa: to'rttasini saqlashda davom etish (ro'yxat-sahifa asosli oqilona), lekin YANGI denorm maydon qo'shishdan oldin xuddi shu "N+1 ro'yxat sahifasi" asoslamasi bo'lishi shart — aks holda "ehtiyot chorasi" sifatida qo'shilgan keshlar rekonsiliatsiyasiz chirib ketadi.

---

## B7 — O'sish prognozi

> **Ogohlantirish:** mahsulot hali ishga tushmagan — bular haqiqiy trafik emas, rejalashtirish uchun tartib-raqam (order-of-magnitude) taxminlari, dastlabki bosqich (10 000–50 000 faol foydalanuvchi, Markaziy Osiyo miqyosi) uchun.

| Jadval | ~qator / 12 oy | yozuv / kun | eng katta so'rov naqshi |
|---|---|---|---|
| `users` | ~50 000 | ~150 (yangi ro'yxat) | `phone` qidiruvi (har login/OTP) |
| `refresh_tokens` | ~400 000 (30 kunlik TTL, har ishlatishda rotatsiya) | ~1 200 | `tokenHash` qidiruvi — **butun tizimdagi ENG YUQORI QPS so'rovi** |
| `staff_members`/`staff_sessions` | <100 / ~2 000 | shovqin darajasida | kichik, faqat ichki |
| `audit_logs` | **~2 000 000+** | ~5 500 | `resourceType+resourceId` (admin drill-down), `createdAt DESC` (feed) |
| `outbox_events` | **~1 500 000+** | ~4 000 | `status+availableAt` (worker so'rovi — YUQORI chastota) |
| `idempotency_keys` | ~300 000 yaratiladi/yiliga (TTL 24 soat, tirik qator soni doim kichik) | ~800 | `(key,userId,endpoint)` aniq tenglik |
| `messages` (Bosqich 6) | **~3 000 000+** | ~8 000 | `conversationId+createdAt` (chat sahifalash) |
| `notifications` (Bosqich 6) | **~5 000 000+** | ~14 000 | `userId+read+createdAt` |
| `ledger_entries` (Bosqich 4) | ~500 000+ | ~1 400 | `accountId+createdAt` (balans), `transactionId` (guruhlash) |

**Partitioning kerakmi?** Hozir — YO'Q. Postgres B-tree indeksi to'g'ri tuzilgan bo'lsa o'nlab million qatorda ham yaxshi ishlaydi; erta partitioning constraint-exclusion/cross-partition unique/backup murakkabligini olib keladi, foyda bermasdan. Tavsiya: (1) HOZIR — `audit_logs`/`notifications` uchun **saqlash siyosati** (frontend mock allaqachon "150 ta" degan cheklovni ko'rsatgan — bu haqiqiy sozlash bo'lishi kerak, masalan `notifications` foydalanuvchi boshiga 150dan ortig'ini arxivlash/o'chirish); (2) `audit_logs` ~50–100 million qatorga yetganda (ko'p yillik gorizont) `RANGE (createdAt)` (oylik) partitioning'ni ko'rib chiqish — undan OLDIN emas.

---

## B8 — Bosqich 3–4 jadvallari (ledger) — taklif

> **Muhim: bu yerda `docs/01-data-model.md` §5'dagi bir qarordan ATAYLAB
> chetga chiqaman — pastda "Nega PLATFORM_ESCROW yo'q" bo'limida
> tushuntirilgan. docs/01 o'zi "Bosqich 0 natijasi — KOD EMAS, dastlabki
> eskiz" deb belgilagan — B8 shu eskizni qayta ko'rib chiqish uchun.**

### `LedgerEntry` shakli

| Maydon | Tip | Izoh |
|---|---|---|
| `id` | UUIDv7 | A1 bilan bir xil qoida |
| `transactionId` | UUID (FK → `Transaction`) | Guruhlash — bitta tranzaksiya ichidagi barcha yozuvlar shu bilan bog'lanadi |
| `accountId` | UUID (FK → `LedgerAccount`) | Qaysi hisobga tegishli |
| `amount` | BigInt, tiyin, **ISHORALI** | Musbat = hisobga qo'shiladi, manfiy = hisobdan ayriladi |
| `currency` | String | v1 faqat `"UZS"` |
| `createdAt` | `Timestamptz` | Yozuv FIZIK qachon kiritilgani — o'zgarmas |
| `postingDate` | `Timestamptz` | Tranzaksiya QAYSI biznes kuniga tegishli (pastda) |

**Ishorali `amount` (bitta ustun), debit/credit ikki ustun EMAS.** An'anaviy buxgalteriya debit/kredit terminologiyasi hisob TURIGA qarab ma'no o'zgartiradi (debit aktiv hisobda OSHIRADI, passiv hisobda KAMAYTIRADI) — bu buxgalteriya bo'yicha o'qitilmagan muhandislar jamoasi uchun xato manbai. Ishorali yagona `amount` ("bu son shu hisobning yugurma balansiga qo'shiladi") tushunarli va `SUM(amount)=0` invariantini trivial ifodalaydi. Bu `docs/01-data-model.md`dagi "amount: BigInt (musbat/manfiy)" bilan MOS — men buni ANIQ tanlov sifatida qayd etyapman, sukut ravishda emas.

**`createdAt` ≠ `postingDate`.** ADR-03: `PaymentCallback` foydalanuvchi qaytishidan oldin HAM, keyin HAM kelishi mumkin — ya'ni yozuv FIZIK kiritilishi (`createdAt`) haqiqiy to'lov voqeasidan soatlab/kunlab kech qolishi mumkin. Moliyaviy hisobot ("bugun qancha daromad bo'ldi") uchun `postingDate` (sukut — `createdAt`ga teng, lekin gateway callback `paidAt`siga moslab orqaga surilishi mumkin) kerak.

**Domen obyektiga havola — `Transaction` darajasida, `LedgerEntry` darajasida EMAS.** `referenceType` (enum: `CONTRACT | MILESTONE | WITHDRAWAL_REQUEST | DISPUTE | PAYMENT_INTENT`) + `referenceId` (String) — POLIMORF juftlik, `Message.contractId`ning ("threadId") xuddi shu naqshi. Har bir `LedgerEntry`ga EMAS, `Transaction`ga qo'yiladi (bitta tranzaksiyaning barcha yozuvlari BITTA domen hodisasiga tegishli — takrorlash shart emas). **Ataylab qabul qilingan kelishuv:** bu chinakam FK EMAS (DB darajasida `referenceId` mavjudligini majburlamaydi) — `Message`da ham xuddi shunday. Yagona yozish yo'li `LedgerService.post()` bo'lishi bu xavfni yumshatadi (yozishdan oldin referensiya mavjudligini tekshiradi).

### Yig'indi = 0 invarianti

**Ikki qatlam — ikkalasi ham, A4/F1 bilan bir xil falsafa:**
1. **Ilova darajasida** — `LedgerService.post(entries[])` yozishdan OLDIN `entries.reduce(sum)===0` tekshiradi, aks holda aniq domain xato (tez, tushunarli xabar).
2. **DB DEFERRABLE constraint trigger** — oxirgi chiziq. `AFTER INSERT ... FOR EACH ROW`, `DEFERRABLE INITIALLY DEFERRED` — tranzaksiya COMMIT bo'lishidan oldin (ko'p `INSERT` bitta DB tranzaksiyasida ketma-ket kelgani uchun DEFERRED shart — aks holda birinchi yozuvdan keyingi oraliq holat, tabiiy ravishda 0 emas, xato tashlab yuborardi) shu `transactionId` uchun `SUM(amount)=0`ni tekshiradi. Bu — kelajakda kimdir `LedgerService.post()`ni chetlab o'tib xom `INSERT`/backfill skript yozsa ham himoya qoladigan YAGONA qatlam.

**Ko'p valyuta bitta tranzaksiyada — YO'Q.** v1 faqat UZS (ADR). Agar FX kelajakda qo'shilsa, valyuta almashinuvi ALOHIDA, o'zining ichida muvozanatlangan tranzaksiya bo'lib modellanadi (`FX_CONVERSION` turi) — hech qachon bitta tranzaksiya ichida aralash valyutali yozuvlar bo'lmaydi.

### Hisoblar (`LedgerAccount`)

`@@unique([ownerType, ownerId, accountType, currency])`, `ownerType: USER | PLATFORM`, `ownerId: String? @db.Uuid` (PLATFORM turlari uchun NULL). Nega bitta userId-only jadval EMAS: `PLATFORM_REVENUE`/`GATEWAY_CLEARING` kabi hisoblar hech qanday egaga tegishli emas — yagona, tizim darajasidagi hisoblar.

**Lazy yaratish (foydalanuvchi hisoblari), Eager (platforma hisoblari).** Ko'pchilik foydalanuvchi hech qachon barcha 3 turdagi (`USER_ESCROW`/`USER_AVAILABLE`/`PAYOUT_PENDING`) hisobga muhtoj bo'lmaydi (masalan sof sotuvchi hech qachon `USER_ESCROW`ga muhtoj emas — faqat xaridorlar escrow qiladi) — birinchi ishlatilishda `getOrCreateAccount()` orqali yaratiladi. Platforma hisoblari (`PLATFORM_REVENUE`, `GATEWAY_CLEARING`) — bitta marta, bootstrap migratsiyasida (har doim mavjud).

### Balans hisoblash

Boshida (Bosqich 4 ishga tushganda) — **oddiy `SUM(amount) WHERE accountId=?`**, hozircha yetarli (hisob boshiga bir necha ming yozuv, `accountId` indeksi bilan sub-millisekund). Checkpoint/snapshot jadvalini (`LedgerAccountBalance{accountId, asOfEntryId, balance}`, HAR yozuvda BIR XIL tranzaksiyada sinxron yangilanadigan) faqat real `EXPLAIN ANALYZE` sekinlikni ko'rsatganda qo'shish — ehtimol `PLATFORM_REVENUE` kabi og'ir hisoblar 10 000–50 000 yozuvga yetganda birinchi bo'lib. Checkpoint qo'shilgandan keyin ham davriy rekonsiliatsiya (checkpoint vs qayta hisoblangan `SUM()`) saqlanadi — B6'dagi bilan bir xil naqsh.

### O'zgarmaslik va tuzatish

Append-only (A4 bilan bir xil qoida) — UPDATE/DELETE yo'q. Xato yozuv → **REVERSAL tranzaksiyasi**: asl tranzaksiyaning HAR bir yozuvini ishorasi teskari holda takrorlaydi. `Transaction.reversesTransactionId` (yozuv darajasida EMAS, tranzaksiya/jurnal-sarlavha darajasida) asl tranzaksiyaga ishora qiladi.

**Reversal'ning reversal'i — TAQIQLANADI (ilova darajasida).** Strukturaviy jihatdan hech narsa bunga to'sqinlik qilmaydi, lekin `reverseTransaction()` `kind=REVERSAL` bo'lgan tranzaksiyani reversal qilishni RAD ETISHI kerak — "bekor qilishni bekor qilish" chalkash audit izi yaratadi (3 tranzaksiya, 1 tasi yetarli bo'lgan joyda). Asl holatni "qayta tiklash" kerak bo'lsa — YANGI, mustaqil tranzaksiya (aniq izoh bilan), reversal zanjiri emas.

### Tashqi to'lov bog'lanishi

`PaymentIntent` ↔ `Transaction` ↔ `LedgerEntry`: `Transaction.referenceType=PAYMENT_INTENT, referenceId=paymentIntent.id` (faqat gateway'dan kelgan DEPOSIT/ESCROW_FUND tranzaksiyalarida). `providerTransactionId` — FAQAT `PaymentIntent`da (`@unique`), `Transaction`/`LedgerEntry`da TAKRORLANMAYDI (bitta manba). `IdempotencyKey` — `Transaction`ga FK'siz qoladi: bog'lanish BILVOSITA (`responseSnapshot` allaqachon natija id'sini o'z ichiga oladi) — `LedgerService` HTTP-qatlam idempotentligidan mustaqil bo'lib qoladi (mas'uliyat ajratilgan).

### Domen zanjiri

```
Contract (feeRateBps SNAPSHOT, totalAmount)
  └─ fundContract → BITTA PaymentIntent (totalAmount UCHUN, "to'liq oldindan")
       └─ tasdiqlanganda → BITTA Transaction(ESCROW_FUND)
            GATEWAY_CLEARING -T ; USER_ESCROW(buyer) +T
  └─ N ta Milestone (har biri o'z amount'i bilan)
       └─ HAR BIR Milestone.accept → O'ZINING Transaction(MILESTONE_RELEASE)
            USER_ESCROW(buyer) -m ; USER_AVAILABLE(seller) +net ; PLATFORM_REVENUE +fee
            (fee/net HISOBLASHDA Contract.feeRateBps o'qiladi — PlatformFeeConfig
             QAYTA o'qilmaydi, snapshot shuning uchun bor)
```

**Muhim, aniq aytilishi kerak:** bitta Contract — BITTA fund-tranzaksiya, lekin KO'P (N ta milestone = N ta) release-tranzaksiya ishlab chiqaradi. Bu birinchi qarashda ravshan emas.

### Nega `PLATFORM_ESCROW` yo'q (docs/01'dan chetga chiqish)

`docs/01-data-model.md`dagi eskiz `PLATFORM_ESCROW`ni `USER_ESCROW`dan ALOHIDA hisob sifatida ko'rsatadi ("ixtiyoriy ko'zgu"). Buni sinab ko'rganimda: agar HAR IKKALASI ham escrow fund vaqtida oshsa, tranzaksiya muvozanatlanmaydi (ikkita ORTIB borayotgan hisob, kamayayotgani yo'q); agar `PLATFORM_ESCROW`ni GATEWAY_CLEARING bilan juftlab, so'ng YANA `USER_ESCROW` bilan "ko'zgulasam" — `PLATFORM_ESCROW` BIR XIL tranzaksiya ichida +T va -T oladi, ya'ni HECH QACHON haqiqiy o'zgaruvchi qiymat ko'rsatmaydi — ORTIQCHA, hech narsani kuzatmaydigan hisob. "Umumiy escrow qancha" degan platforma metrikasi (admin dashboard) buning o'rniga oddiy agregat: `SUM(balance) WHERE accountType=USER_ESCROW` (yoki B6'dagi kabi davriy materiallashtirilgan rollup, agregat sekinlashsa). **Xulosa: `USER_ESCROW(buyer)` YAGONA, haqiqiy escrow hisobi; alohida platforma-darajasidagi "pool" hisobi YO'Q.** Bu — docs/01'dan ANIQ chetga chiqish, foydalanuvchi ko'rib chiqishi uchun ochiq qoldirilgan qaror.

**Ochiq savol (soxta ishonch bilan yopilmagan).** `GATEWAY_CLEARING`ning ishora konvensiyasi (inbound funding'da kamayadi, outbound payout'da oshadi — pastdagi ssenariylarda ko'rsatilgan) — MVP uchun soddalashtirish, real xazina/hisob-kitob (treasury) darajasidagi qat'iylik EMAS. Har provayder uchun alohida clearing hisobi va bank-darajasidagi rekonsiliatsiya — Bosqich 5+ (real payout rail integratsiyasi) masalasi, hozir hal qilinmagan.

### Ssenariylar (tiyin, 1 so'm = 100 tiyin; `feeRateBps=500` = 5%)

**1. Xaridor 1 000 000 so'm to'laydi (Payme) → escrow**
```
Transaction T1  kind=ESCROW_FUND  ref=(Contract C1)
  GATEWAY_CLEARING          -100 000 000
  USER_ESCROW(buyer B1)     +100 000 000
  Σ = 0 ✓
```

**2. Milestone tasdiqlandi, komissiya 5%** (bitta 1 000 000 so'mlik milestone)
```
fee = floor(1 000 000 × 500/10000) = 50 000 so'm ; net = 950 000 so'm
Transaction T2  kind=MILESTONE_RELEASE+COMMISSION  ref=(Milestone M1)
  USER_ESCROW(buyer B1)       -100 000 000
  USER_AVAILABLE(seller S1)    +95 000 000
  PLATFORM_REVENUE              +5 000 000
  Σ = 0 ✓
```

**3. Milestone 3 qismga bo'lingan, yaxlitlash qoldig'i bor** (totalAmount=1 000 000 so'm → 333 334 / 333 333 / 333 333 so'm)
```
M1 (333 334): fee=floor(333 334×0.05)=16 666 ; net=316 668
M2 (333 333): fee=floor(333 333×0.05)=16 666 ; net=316 667
M3 (333 333): M2 bilan bir xil

Transaction T3a  ref=(Milestone M1)
  USER_ESCROW(buyer B1)       -33 333 400
  USER_AVAILABLE(seller S1)   +31 666 800
  PLATFORM_REVENUE             +1 666 600
  Σ = 0 ✓
Transaction T3b  ref=(Milestone M2)   — T3c (M3) BIR XIL
  USER_ESCROW(buyer B1)       -33 333 300
  USER_AVAILABLE(seller S1)   +31 666 700
  PLATFORM_REVENUE             +1 666 600
  Σ = 0 ✓
```
**Izoh:** 3 ta komissiya yig'indisi (16 666×3=49 998 so'm) gipotetik "totalAmount'ga bir martalik" hisobdan (floor(1 000 000×0.05)=50 000) 2 so'mga KAM — bu XATO EMAS. Komissiya HAR BIR milestone RELEASE vaqtida, mustaqil hisoblanadi (chunki milestone'lar vaqt bo'yicha mustaqil chiqariladi) — "umumiy summa uchun bitta hisoblash momenti" umuman yo'q, demak solishtiradigan "qoldiq" ham yo'q. Yagona invariant — HAR BIR tranzaksiya o'zi 0'ga yig'iladi.

**4. Nizo xaridor foydasiga — to'liq qaytarish** (Contract C2, 500 000 so'mlik hali FUNDED milestone)
```
Transaction T4  kind=REFUND  ref=(Dispute D1, Contract C2)
  USER_ESCROW(buyer B2)        -50 000 000
  USER_AVAILABLE(buyer B2)     +50 000 000   (ichki balansga — ADR-08)
  Σ = 0 ✓
```
Komissiya YO'Q — ish qabul qilinmagan, platforma hech narsa "ishlab topmagan".

**5. Nizo bo'lingan (60/40)** (pool=100 001 so'm — ataylab teng bo'lmagan, yaxlitlash qoldig'ini ko'rsatish uchun)
```
buyerShare = floor(100 001×0.60) = 60 000 ; sellerShare = floor(100 001×0.40) = 40 000
qoldiq = 100 001 - 60 000 - 40 000 = 1 so'm → PLATFORM_REVENUE
Sotuvchi ulushiga ham standart komissiya qo'llanadi (u ham "chiqarilgan" ish evazi):
  fee = floor(40 000×0.05) = 2 000 ; sellerNet = 38 000

Transaction T5  kind=REFUND+PAYOUT (SPLIT)  ref=(Dispute D2, Contract C3)
  USER_ESCROW(buyer B3)         -10 000 100
  USER_AVAILABLE(buyer B3)       +6 000 000   (60% — komissiyasiz)
  USER_AVAILABLE(seller S3)      +3 800 000   (40% dan komissiya chegirilgan)
  PLATFORM_REVENUE                 +200 000   (komissiya)
  PLATFORM_REVENUE                     +100   (60/40 yaxlitlash qoldig'i — 1 so'm)
  Σ = 0 ✓  (Contract.totalAmount shu milestone hissasiga kamayadi)
```
Komissiya va yaxlitlash qoldig'i ATAYLAB IKKI ALOHIDA yozuv (bir xil hisobga) — ikki xil MANBA (nega pul kelgani) auditda aralashib ketmasin.

**6. Sotuvchi 500 000 so'm yechib oladi**
```
Transaction T6a  kind=PAYOUT (so'ralgan/tasdiqlangan)  ref=(WithdrawalRequest W1)
  USER_AVAILABLE(seller S1)    -50 000 000
  PAYOUT_PENDING(seller S1)    +50 000 000   ("band" summa)
  Σ = 0 ✓
Transaction T6b  kind=PAYOUT (rail CONFIRMED)  ref=(WithdrawalRequest W1)
  PAYOUT_PENDING(seller S1)    -50 000 000
  GATEWAY_CLEARING             +50 000 000   (pul HAQIQATAN tashqariga chiqdi)
  Σ = 0 ✓
```

**7. Payout provayderda muvaffaqiyatsiz bo'ldi — pul qanday qaytadi**
```
Transaction T7  kind=REVERSAL  reversesTransactionId=T6a  ref=(WithdrawalRequest W1)
  PAYOUT_PENDING(seller S1)    -50 000 000   (T6a'ning ANIQ teskarisi)
  USER_AVAILABLE(seller S1)    +50 000 000
  Σ = 0 ✓
```
`WithdrawalRequest.status→rejected`, `Payout.failedReason` to'ldiriladi; sotuvchi "yechish mumkin" balansi tiklanadi, boshqa karta bilan qayta urinishi mumkin. **`T6b` UMUMAN CHAQIRILMAYDI bu holatda** — rail muvaffaqiyatsiz bo'lganda faqat `T6a` mavjud, uni bekor qilamiz.

**8. To'lov o'tdi, lekin contract bekor qilindi** (Contract C4, 2 milestone: M1=400 000 so'm ALLAQACHON qabul qilingan, M2=600 000 so'm hali FUNDED)
```
(Ilgari, mustaqil ravishda yakunlangan: Transaction T-M1 — M1 uchun MILESTONE_RELEASE,
 USER_ESCROW(B4) -40 000 000 ; USER_AVAILABLE(S4) +38 000 000 ; PLATFORM_REVENUE +2 000 000.
 cancelContract BUNGA TEGMAYDI — allaqachon yopilgan.)

Transaction T8  kind=REFUND  ref=(Contract C4, cancelContract)
  USER_ESCROW(buyer B4)        -60 000 000   (FAQAT M2'ning hali FUNDED qismi)
  USER_AVAILABLE(buyer B4)     +60 000 000   (ichki balansga, KARTAGA EMAS — CLAUDE.md)
  Σ = 0 ✓
```
**#1 amalga oshirish xavfi (aynan shu ssenariy uchun):** `cancelContract`ning ledger mantig'i qaytariladigan summani **FAQAT hali FUNDED (SUBMITTED/ACCEPTED emas) bosqichlar yig'indisi** sifatida hisoblashi SHART — `Contract.totalAmount`ni BUTUNLIGICHA EMAS. Agar kimdir soddalik uchun "butun totalAmount'ni qaytar" deb yozsa — bu ssenariyda 400 000 so'mni HAVODAN yaratib beradi (sotuvchi allaqachon oldi, xaridor balansiga YANA qo'shiladi) — bu aynan "prod'da pul yo'qolishi"ning aksi, pul KO'PAYIB QOLISHI (ikkalasi ham xato, lekin bu turi ko'proq e'tibordan chetda qoladi, chunki "xaridorga ko'proq qaytdi" shikoyat qilinmaydi). Bu — Bosqich 4 test qamrovida ALOHIDA, ATAYLAB yozilishi kerak bo'lgan holat.

Ikkinchi kuzatuv: bekor qilish gateway'ga (Payme'ga) HECH QACHON qaytmaydi — pul ICHKI balansga tushadi (CLAUDE.md, ADR-08 — qasddan qaror, bu yerda qayta ko'rib chiqilmayapti). Ya'ni T1'dagi asl `GATEWAY_CLEARING -T` yozuvi HECH QACHON teskari qilinmaydi; naqd pul kontseptual ravishda "platforma ichida" qoladi.
