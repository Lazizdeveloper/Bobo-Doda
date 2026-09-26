# RUNBOOK — Bobo&Doda

Operatsion qo'llanma: tarmoq strategiyasi, lokal ishga tushirish, migratsiya +
DB rollari, monorepo, CI. Arxitektura qarorlari — [`02-decisions.md`](./02-decisions.md).

---

## 1. Tarmoq strategiyasi

| Tarmoq | Maqsad | Kim yozadi |
|---|---|---|
| `main` | **Faqat relizlar.** Har commit — deploylanadigan holat. Tag qo'yiladi. | faqat `develop` dan merge (PR) |
| `develop` | **Backend + integratsiya ishi shu yerda boradi.** Bosqichlar (2, 3, …) shu yerga PR bilan tushadi. | feature branch → PR → `develop` |
| `feat/<...>`, `fix/<...>` | Bitta ish birligi | ishlab chiquvchi |

- **`main` ga to'g'ridan-to'g'ri push YO'Q** (Stage 1 poydevor commit'idan keyin).
- Har bosqich `develop` da yig'iladi, DoD bajarilgach `develop → main` PR.
- Frontend (kabinetlar/admin/landing) tayyor mahsulot — o'z hotfix'lari
  `main` ga bevosita PR bilan borishi mumkin; backend unga tegmaydi.
- CI ikkala tarmoqda ham ishlaydi (`main`, `develop`) — quyida §6.

```bash
git checkout develop && git pull
git checkout -b feat/stage-2-auth
# ... ish ...
git push -u origin feat/stage-2-auth      # → PR: feat/stage-2-auth → develop
```

---

## 2. Lokal ishga tushirish

### Talablar
- Node 22 (backend `engines: >=22`), npm 10+.
- **NixOS:** `nix-shell backend/shell.nix` — Prisma engine binary'lari
  (`linux-nixos` uchun precompiled yo'q) va `postgresql_16` shu yerdan.
  Boshqa distributsiya / Docker / CI'da kerak emas.
- Postgres + Redis (`test:e2e` uchun) — CI'da service konteyner, lokal'da
  `docker compose up -d postgres redis` yoki nix throwaway klaster
  (`E2E_SUPERUSER_URL` / `E2E_REDIS_URL` bilan). Yo'q bo'lsa e2e suite'lar
  o'zini o'tkazib yuboradi; A4 isboti Docker'siz `scripts/prove-append-only.sh`.

### Monorepo (npm workspaces)

```
/                     root package.json — frontend (Next.js) + workspaces
/backend              NestJS API
/packages/contracts   OpenAPI'dan generatsiya qilingan TS tiplari + enum map
```

`npm install` **ILDIZDAN** (bitta hoisted `node_modules`, bitta
`package-lock.json`). `backend/package-lock.json` YO'Q.

```bash
# NixOS:
nix-shell backend/shell.nix --run 'npm install'
# boshqa:
npm install
```

**Hoisting tuzog'i — `rxjs`.** Root `overrides.rxjs = "7.8.2"` (`package.json`).
Backend to'g'ridan-to'g'ri `rxjs` ga bog'liq (`@nestjs/*` orqali ham), root
esa hech qanday `rxjs` cheklovi qo'ymaydi (frontend uni ishlatmaydi) — shu
sababli npm ikki xil versiyani (root'da bittasi, `backend/node_modules`da
boshqasi) hoisting qilib qo'ygan edi, va TypeScript ikkita "boshqa-boshqa"
`rxjs.Subscriber` tipini bir-biriga mos kelmaydi deb backend `typecheck`ni
yiqitgan edi (`logging.interceptor.ts`). **Yangi backend dependency
qo'shsangiz** (ayniqsa `@nestjs/*` oilasidan) — `npm ls <paket>` bilan bitta
versiya (root'da, `backend/node_modules`da EMAS) qolganini tekshiring; agar
ikkiga bo'linsa — `overrides`ga qo'shing yoki backend'dagi range'ni
moslashtiring, keyin `rm -rf node_modules */node_modules package-lock.json
&& npm install` bilan toza o'rnating (versiya oshirish yetarli emas —
lockfile'dagi eski nested nusxa qolib ketadi).

### Variant A — hammasi Docker'da
```bash
cd backend && docker compose up
#  postgres (+ rollar init) + redis + minio + migrate + api
#  → http://localhost:4000/health/ready → 200 ;  /docs → Swagger
```

### Variant B — infra Docker'da, API lokal
```bash
cd backend
docker compose up -d postgres redis minio
npm run prisma:migrate        # birinchi migratsiya (dev)
npm run start:dev
```

### Variant C — Docker'siz (NixOS lokal binary)
```bash
nix-shell backend/shell.nix
#  ichida: throwaway PG klaster + redis-server qo'lda ko'tariladi
#  (scripts/prove-append-only.sh xuddi shu naqshni ishlatadi)
```

---

## 3. Migratsiya + DB rollari (A2 / A4)

### Ikki rol, ikki URL

| Rol | URL env | Huquq | Kim ishlatadi |
|---|---|---|---|
| `bobododa_migrator` | `DATABASE_MIGRATION_URL` | DDL, `CREATE EXTENSION`, `GRANT` | faqat `prisma migrate deploy` (schema `directUrl`) |
| `bobododa_app` | `DATABASE_URL` | `SELECT/INSERT/UPDATE/DELETE` — **istisnolar bilan** | ishlaydigan API (`PrismaClient`) |

Ikkala env ham **majburiy** (Zod `env.schema.ts`). `PrismaClient` runtime'da
`DATABASE_MIGRATION_URL` ni ishlatmaydi — faqat Prisma CLI (`directUrl`).

### Append-only DB darajasida

Init migratsiya (`20260909232121_init/migration.sql`) oxirida, `bobododa_app`
roli mavjud bo'lsa:

```sql
REVOKE UPDATE, DELETE ON "audit_logs"   FROM bobododa_app;   -- to'liq append-only
REVOKE UPDATE, DELETE ON "outbox_events" FROM bobododa_app;
GRANT  UPDATE (status, attempts, "lastError", "availableAt", "processedAt")
       ON "outbox_events" TO bobododa_app;                    -- worker holati
```

- **`LedgerEntry` (Bosqich 4)** paydo bo'lganda o'sha migratsiyaga xuddi
  shunday `REVOKE UPDATE, DELETE` qo'shiladi.
- `idempotency_keys` **ataylab yoziladigan** — idempotentlik middleware'i
  javob snapshot'ini `UPDATE` bilan yozadi.
- Guard `IF EXISTS (SELECT 1 FROM pg_roles ...)` — rol bootstrap qilinmagan
  toza lokal DB da (`prisma migrate dev`) migratsiya yiqilmaydi; append-only
  majburlash faqat rollar sozlangan muhitda faollashadi.

**T2 — yagona manba.** Yuqoridagi jadval/huquq ro'yxati (`audit_logs`,
`outbox_events`) endi ham F1 tekshiruvida, ham shu migratsiyada QO'LDA
mustaqil yozilmaydi: `backend/src/common/db/append-only.constants.ts`
(`APPEND_ONLY_TABLES`) — F1 (`checkDbRoleHardening`) shu obyektni aylanib
chiqadi. Migratsiya SQL'i statik bo'lgani uchun bu ro'yxatdan avtomatik
generatsiya qilinmaydi (Prisma migratsiyalari qo'lda yoziladi, ADR) —
o'rniga `test/db-role-assertion.e2e-spec.ts` dagi happy-path testi REAL DB
huquqlarini so'rab ikkalasini solishtiradi: Bosqich 4'da `ledger_entries`
`APPEND_ONLY_TABLES`ga qo'shilib, migratsiyaga REVOKE qo'shilmasa — shu test
QIZARADI (matn emas, xatti-harakat solishtiriladi — SQL formatlash
o'zgarsa ham yolg'on qizarmaydi).

### Rollarni yaratish (bir marta, superuser)

- **docker-compose:** `backend/docker/initdb/10-roles.sh` — postgres
  konteynerining BIRINCHI init'ida avtomatik (bo'sh data-dir).
  Reset: `docker compose down -v`.
- **CI / prod / test:** `backend/prisma/sql/roles.sql`
  (`psql -v app_pw=… -v migrator_pw=… -v db_name=bobododa
  [-v app_role=… -v migrator_role=…] -f prisma/sql/roles.sql`). Rol
  nomlari ixtiyoriy (T1, sukut `bobododa_app`/`bobododa_migrator`).
  Ichida `DO $$...$$` bloklari YO'Q — psql `:'var'`/`:"var"` almashtirishi
  dollar-quote ICHIDA ishlamaydi (sinab ko'rilgan); o'rniga
  `SELECT format(...) WHERE NOT EXISTS(...) \gexec` naqshi.
- **Integration test:** `test/db-roles.e2e-spec.ts` / `db-role-assertion.e2e-spec.ts`
  superuser bilan (Prisma orqali, `provisionDb()`) yaratadi.

### Managed Postgres — rollarni QO'LDA yaratish (F1)

`docker/initdb/10-roles.sh` FAQAT yangi konteynerning **birinchi** ko'tarilishida
ishlaydi (bo'sh data-dir). Managed Postgres'da (Yandex Cloud, RDS, Cloud SQL,
Supabase va h.k.) bu skript HECH QACHON ishlamaydi — rollarni qo'lda,
bitta martalik provisioning qadami sifatida yarating:

```bash
# 1. Superuser (yoki CREATEROLE+CREATEDB huquqli) ulanish bilan:
psql "$SUPERUSER_URL" \
  -v app_pw="$(openssl rand -base64 24)" \
  -v migrator_pw="$(openssl rand -base64 24)" \
  -v db_name=bobododa \
  -v app_role=bobododa_app \
  -v migrator_role=bobododa_migrator \
  -f backend/prisma/sql/roles.sql
# `app_role`/`migrator_role` — T1: provayder nomga cheklov qo'ysa (prefiks,
# uzunlik, rezervlangan so'z) shu ikkitasini xohlagan nomga o'zgartiring —
# qolgani (2, 3-qadam) avtomatik moslashadi. Berilmasa sukut ishlatiladi.
# Parollarni xavfsiz joyga yozib qo'ying (secret manager) — bu skript
# ularni faqat o'sha ishga tushirishda ko'rsatadi.

# 2. Migratsiya — MIGRATOR bilan (kengaytma + GRANT/REVOKE shu yerda ishlaydi):
DATABASE_URL="postgresql://<app_role>:<app_pw>@<host>:5432/bobododa?schema=public" \
DATABASE_MIGRATION_URL="postgresql://<migrator_role>:<migrator_pw>@<host>:5432/bobododa?schema=public" \
  npx prisma migrate deploy

# 3. Runtime .env / secret'da DATABASE_URL — FAQAT <app_role> bilan, VA
#    DB_APP_ROLE=<app_role> (F1 shu ikkisini solishtiradi).
#    DATABASE_URL ga migrator rolini qo'ymang — F1 boot'da rad etadi.
```

Ba'zi managed provayderlar (masalan Cloud SQL, RDS) standart `postgres`
superuser'ini bermaydi — o'rniga `rds_superuser` kabi teng huquqli rol beriladi.
`roles.sql` faqat `CREATE ROLE`, `GRANT`, `ALTER DEFAULT PRIVILEGES`,
`ALTER DATABASE ... SET` ishlatadi — bu rollarda odatda yetarli (superuser
SHART emas). Barcha rol nomlari `format('%I', …)`/psql `:"var"` bilan
kvotalanadi (identifikator-xavfsiz) — string konkatenatsiya yo'q.

### Boot-vaqtidagi rol tekshiruvi — F1 (fail closed)

Append-only DB darajasida majburlangan bo'lishi kifoya emas — buni HECH KIM
tekshirmasa, "himoya bor" degan noto'g'ri ishonch qoladi (masalan
`DATABASE_URL`ga xatoan `bobododa_migrator` yozilsa, hammasi "ishlaydi",
lekin `audit_logs` yana o'zgartirilishi mumkin bo'lib qoladi — signal yo'q).

`PrismaService.onModuleInit` — `$connect()`dan keyin, `/health/ready` javob
berishidan OLDIN (`src/infra/prisma/db-role-assertion.ts`):

1. `SELECT current_user` = `bobododa_app` bo'lishi shart
2. `has_table_privilege('audit_logs', 'UPDATE'/'DELETE')` = false
3. `has_table_privilege('outbox_events', 'DELETE')` = false
4. Kengaytmalar bor: `pg_trgm`, `unaccent`, `citext`, `btree_gin`

Bittasi ham bajarilmasa — **ilova ko'tarilmaydi**, xato aniq: qaysi
tekshiruv yiqildi + tuzatish qadamlari (yuqoridagi 3 qadam).

`DB_ROLE_ASSERTION=off` — FAQAT dev/test qulayligi uchun (masalan rollarsiz
lokal `prisma migrate dev`). `NODE_ENV=production`da Zod uni **rad etadi**
(`env.schema.ts` — SWAGGER_ENABLED bilan bir xil "fail closed" naqsh) —
bypass production'da imkonsiz.

Isbot: `test/db-role-assertion.e2e-spec.ts` — to'g'ridan-to'g'ri funksiya
(happy/fail-closed/bypass) + `scripts/boot-check.ts` orqali **haqiqiy,
alohida process'da** boot (noto'g'ri rol → process 1 bilan chiqadi, aniq
xato bilan) — jumladan sukutdan **butunlay boshqa** rol nomi bilan (T1,
`DB_APP_ROLE`, pastga qarang).

**T1 — rol nomi `DB_APP_ROLE` bilan sozlanadi.** Sukut `bobododa_app`, lekin
migratsiya faylida QATTIQ YOZILMAGAN — DB darajasidagi GUC'dan
(`bobododa.app_role`, `prisma/sql/roles.sql` o'rnatadi) o'qiladi. Managed
Postgres provayderi rol nomiga cheklov qo'ysa (prefiks, uzunlik,
rezervlangan so'z): `roles.sql`ni boshqa `-v app_role=...` bilan qayta
ishga tushiring va `DB_APP_ROLE`ni shunga moslang — **migratsiyaga tegilmaydi**.

> ⚠️ **Connection pooler (PgBouncer, Yandex/Supabase managed pooler) haqida.**
> F1'ning birinchi tekshiruvi — `SELECT current_user`. Agar `DATABASE_URL`
> to'g'ridan-to'g'ri Postgres'ga emas, **transaction/statement-mode pooler**
> orqali ulansa, pooler CLIENT autentifikatsiyasidan qat'i nazar bir nechta
> ilova ulanishini bitta (yoki kam sonli) FIZIK Postgres backend'iga
> multipleksatsiya qilishi mumkin — bunday sozlashda `current_user` F1
> kutgandan BOSHQACHA (masalan pooler'ning umumiy/administrator roli)
> qaytishi mumkin, va F1 **yolg'on YIQILISHI** mumkin (ilova aslida to'g'ri
> huquqlarga ega bo'lsa ham). `session`-mode pooling odatda muammo emas
> (bitta client — bitta backend, butun sessiya davomida). GUC o'qish
> (`current_setting('bobododa.app_role', ...)`) o'zi muammo EMAS — bu DB
> darajasidagi sukut, har yangi FIZIK ulanishda avtomatik qo'llanadi, pooling
> rejimidan qat'i nazar. **Agar pooler qo'shsangiz:** avval `session`-mode
> tekshiring (F1 o'zgarishsiz ishlaydi); `transaction`/`statement`-mode
> shart bo'lsa, F1'ni pooler ORQASIDAGI DIRECT ulanishda ishga tushiring
> (masalan alohida "admin" port/URL — ko'p pooler shuni beradi) yoki
> `current_user` tekshiruvini pooler konfiguratsiyasiga moslab qayta ko'ring.
> Kod o'zgarishi ZARUR EMAS — bu faqat DEPLOY konfiguratsiyasi savoli.

### Kengaytmalar (A2)

Init migratsiya boshida, migrator roli bilan:
`pg_trgm`, `unaccent` (kirill/lotin qidiruv — Bosqich 3), `citext` (email /
normallashtirilgan telefon), `btree_gin` (aralash GIN). Hammasi PG13+ da
"trusted" — migrator superuser bo'lishi shart emas.

### Migratsiya immutabilligi

`develop` ga merge qilingan migratsiya fayli **o'zgartirilmaydi**
(Prisma `_prisma_migrations` checksum). Yangi o'zgarish — yangi migratsiya.
(Stage 1 init fayli merge'gacha bir marta tahrirlandi — A1/A2/A4 — bu oxirgi
ruxsat etilgan tahrir edi.)

### Vaqt (A3)

Barcha ustun `DateTime @db.Timestamptz(6)`. Konteyner/DB `TZ=UTC` + `PGTZ=UTC`
(docker-compose, Dockerfile). `timestamp` (tz'siz) ISHLATILMAYDI — server
mintaqasi o'zgarsa hisobotlar jimgina buzilardi. Lokal vaqtga aylantirish
faqat ko'rsatish qatlamida.

### ID (A1)

Barcha PK — **UUIDv7** (`uuidv7` npm paketi, bir ms ichida ham monotonik).
Prisma `@default(uuid())` (v4) YO'Q. Yagona manba:
`backend/src/common/id/id.factory.ts` — `newId()` / `IdFactory`. Service
qatlami `data: { id: this.ids.next(), … }` beradi. PG16 da native `uuidv7()`
yo'q (PG18+).

---

## 4. `@bobododa/contracts` generatsiyasi

```bash
npm run generate:contracts       # root'dan
```

1. `backend/scripts/emit-openapi.ts` — Nest app'ni DI grafida ko'taradi
   (`app.init()` YO'Q → DB/Redis KERAK EMAS), Swagger doc quradi →
   `packages/contracts/openapi.json`.
2. `openapi-typescript` → `src/openapi-types.ts`.
3. `backend/prisma/schema.prisma` enum bloklari (regex) → `src/enums.ts`.
4. Barre → `src/index.ts`.

**Qo'lda yozilgan kod yo'q.** Generatsiya natijasi commit qilinadi
(frontend build generatsiyani talab qilmasin). `lib/api/wire-enums.ts`
(Bosqich 2) shu paketdan enum ro'yxatini import qiladi — exhaustive
`Record<Backend,Frontend>` tekshiruvi shунга tayanadi (ADR-02).

---

## 5. Skriptlar (root)

| Skript | Vazifa |
|---|---|
| `npm run dev` | Frontend dev server (:3000) |
| `npm run build` | **Frontend** (`next build`) — Netlify shuni chaqiradi |
| `npm run build:backend` | `nest build` |
| `npm run lint` | Frontend + `--workspaces` (backend eslint). **`--max-warnings=0`** — ogohlantirish ham qizil (F3: 20 ta ogohlantirish yig'ilib, hech kim qaramaydigan bo'lib qolmasin). |
| `npm run typecheck` | Frontend `tsc` + `--workspaces` (backend + contracts) |
| `npm test` | `--workspaces` (backend Jest unit) |
| `npm run lint:app` / `typecheck:app` | Faqat frontend (CI `ci.yml` shuni ishlatadi) |
| `npm run generate:contracts` | yuqorida §4 |
| `npm run verify` | `lint && typecheck && check:csp && build` (butun monorepo lint/typecheck) |
| `npm run verify:all` | `verify` + `build:backend` |

Backend'ning o'z skriptlari (`npm run <x> --workspace backend`):
`start:dev`, `prisma:migrate`, `prisma:migrate:deploy`, `test:e2e`, `test:cov`.

---

## 6. CI

| Workflow | Trigger | Ish |
|---|---|---|
| `.github/workflows/backend-ci.yml` | `push`/`PR` → `main`,`develop` (paths: `backend/**`, `packages/**`, root manifest) + `workflow_dispatch` | **quality:** root `npm ci` → prisma validate/generate → backend lint/typecheck/unit/build → `generate:contracts`. **integration:** `postgres:16-alpine` + `redis:7-alpine` **service konteynerlari** (`localhost:5432/6379`), `CI_REQUIRE_E2E=true` (F2) + `npm run test:e2e` (`health` + `db-roles` A4 append-only isboti + `db-role-assertion` F1 boot tekshiruvi isboti). |
| `.github/workflows/ci.yml` | `push`/`PR` → `main`,`develop` (backend/docs o'zgarishi bundan tashqari) | Frontend: CSP + `lint:app` + `typecheck:app` + `next build`. |
| `.github/workflows/codeql.yml` | — | Xavfsizlik skani (o'zgarmagan) |

Qo'lda ishga tushirish: `gh workflow run "Backend CI" --ref develop`.
Kuzatish: `gh run watch <id>` / `gh run view <id> --log-failed`.

**Nega service konteyner, Testcontainers emas:** `@testcontainers/redis`
ba'zi runner'larda app-dan ulanishni "Connection is closed" bilan yiqitardi.
Service konteynerlar — GitHub Actions'ning standart, ishonchli naqshi.
`db-roles` e2e superuser sifatida o'z `roles_e2e` DB'sini yaratadi + rollarni
o'rnatadi; `health` e2e o'z `health_e2e` DB'sini. **DIQQAT:** e2e spec'lar
`AppModule` ni fayl boshida import qiladi — `@nestjs/config` `process.env` ni
import vaqtida snapshot qiladi, shuning uchun ulanish URL'lari
`test/jest-e2e.setup.ts` (setupFiles) da, `beforeAll` dan OLDIN o'rnatiladi.

**F2 — "infra yo'q" JIMGINA yashil bo'lib qolmasin.** Har uch e2e suite
`requireInfraOrSkip()` orqali boshlanadi (`test/support/e2e-infra.ts`):
Postgres yetib bo'lmasa va `CI_REQUIRE_E2E=true` bo'lsa — suite SKIP emas,
**YIQILADI** ("infra kutilgan edi, topilmadi"). Integration job'da bu flag
doim yoqilgan — `E2E_SUPERUSER_URL` yoki service konteyner nomi xato
yozilsa, CI shu yerda qizil bo'ladi, uni hech kim "yashil" deb o'tkazib
yubormaydi. Lokal ishda flag yo'q — infra bo'lmasa qulay skip.

---

## 7. Tekshiruv (lokal, DoD)

```bash
# NixOS: hammasi nix-shell ichida
nix-shell backend/shell.nix

# butun monorepo
npm run verify:all           # frontend lint/typecheck/csp/build + backend build
npm test                     # backend unit (Jest)
npm run generate:contracts   # packages/contracts to'ldiriladi

# A4 — append-only isboti (Docker'siz, throwaway PG klaster)
bash backend/scripts/prove-append-only.sh
#   → "permission denied for table audit_logs" ni ko'rsatadi, exit 0

# e2e (health + db-roles + db-role-assertion/F1) — Postgres + Redis kerak.
# CI'da service konteyner; lokal'da manzilni env bilan bering:
E2E_SUPERUSER_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
E2E_REDIS_URL=redis://127.0.0.1:6379 \
  npm run test:e2e --workspace backend
#   → Test Suites: 3 passed, Tests: 20 passed
# Infra berilmasa suite'lar o'zini o'tkazib yuboradi (pgReachable() false) —
# CI_REQUIRE_E2E=true bersangiz (F2) buning o'rniga YIQILADI:
CI_REQUIRE_E2E=true E2E_SUPERUSER_URL=postgresql://x:x@127.0.0.1:1/x \
  npm run test:e2e --workspace backend
#   → Test Suites: 3 failed (qasddan buzilgan manzil bilan — mexanizm isboti)
```

---

## 8. Ledger (Bosqich 6) — moliyaviy incident bo'lsa

**`ledger_accounts`/`ledger_transactions`/`ledger_entries`ga HECH QACHON
qo'lda `UPDATE`/`DELETE` yozilmasin** — bu shunchaki tavsiya emas, DB
darajasida majburlangan (`bobododa_app`dan REVOKE qilingan; hatto
`bobododa_migrator`/superuser bilan qo'lda tuzatish HAM noto'g'ri —
append-only'ning butun maqsadi "hech kim, hech qachon" degani).

Xato journal (masalan noto'g'ri summa bilan post qilingan) topilsa:

1. **Hech qanday qatorni tahrirlama.** Xato journal DOIM shu ko'rinishda qoladi.
2. Tuzatish — **reversal journal**: asl tranzaksiyaning har bir yozuvini
   ishorasi teskari holda takrorlaydigan YANGI `LedgerTransaction`
   (`docs/03-schema-review.md` B8'dagi naqsh). Bu Bosqich 6'da HALI
   implement qilinmagan (`LedgerService`da reversal metodi yo'q) — Bosqich
   7+ vazifasi. Hozircha aniqlangan nomuvofiqlik `LedgerIntegrityService`
   (`src/modules/ledger/ledger-integrity.service.ts`) orqali topiladi va
   qo'lda tekshiriladi/hujjatlashtiriladi, avtomatik tuzatilmaydi.
3. Muvofiqlikni tekshirish uchun (Nest ilova konteksti ichida, masalan
   `nest console`/vaqtinchalik skript orqali):
   `LedgerIntegrityService.findUnfundedSucceededPayments()`,
   `findUnsettledCompletedContracts()`, `findUnbalancedTransactions()`.

**Production'ga chiqarishdan oldin (tarixiy ma'lumot):** agar deploy
qilinadigan muhitda Bosqich 5'dan oldin yozilgan `SUCCEEDED` Payment yoki
Bosqich 4'dan oldingi `COMPLETED` Contract qatorlari mavjud bo'lsa, ular
Bosqich 6 migratsiyasidan keyin ledger funding/settlement journal'iga EGA
BO'LMAYDI (chunki journal faqat YANGI webhook/approve hodisalarida
yoziladi, orqaga qarab backfill qilinmaydi). Bu holatni
`LedgerIntegrityService` yuqoridagi metodlar bilan aniqlaydi — agar
natija bo'sh bo'lmasa, real deploy'dan OLDIN controlled backfill skripti
yozish yoki (agar hali real trafik yo'q bo'lsa) shu qatorlarni bilib
turib e'tiborsiz qoldirish qarori ANIQ hujjatlashtirilishi kerak.

## 9. Reconciliation (Bosqich 9) — stuck operatsiyalar, provider timeout, anomaliyalar

**Asosiy tamoyil: LOKAL TIMEOUT != PROVIDER XATOSI.** Payment/Refund/Payout
yaratish yoki so'rash paytida tarmoq/timeout xatosi provider haqiqatan
muvaffaqiyatsiz bo'lganini ANGLATMAYDI — provider so'rovni qabul qilgan,
lekin javob yo'qolgan bo'lishi mumkin. Shuning uchun bunday holatlar
tizimda **PENDING/PROCESSING** holatda "osilib" qoladi — bu Bosqich 9'gacha
qo'lda (staff) yoki umuman hal qilinmagan edi. Reconciliation shu
noaniqlikni HAL QILADI: provider'dan HAQIQIY holatni so'raydi va faqat
provider AUTORITATIV javob berganda (`SUCCEEDED`/`FAILED`) mavjud (Bosqich
5/6/7) webhook state-machine'ini ishga tushiradi — **yangi ledger mantiq
YOZILMAGAN**, faqat qayta ishlatiladi.

### "Stuck" nima anglatadi

- **Payment** `PENDING`/`PROCESSING`da, `updatedAt` dan
  `PAYMENT_RECONCILE_AFTER_SECONDS` (sukut 300s) dan ko'p vaqt o'tgan.
- **Refund** — xuddi shunday, `REFUND_RECONCILE_AFTER_SECONDS`.
- **Payout** — xuddi shunday, `PAYOUT_RECONCILE_AFTER_SECONDS`. **Payout
  `PROCESSING`da uzoq tursa ham HECH QACHON avtomatik "release"
  qilinmaydi** — mablag' `PAYOUT_CLEARING` hisobida xavfsiz turadi, faqat
  provider **avtoritativ** ravishda `FAILED` deganda `PAYOUT_RELEASE`
  journal yoziladi va seller balansi tiklanadi. Vaqt o'tishi — bu DALIL
  EMAS.

Avtomatik job (`ReconciliationSchedulerService`, BullMQ repeatable,
`RECONCILIATION_INTERVAL_SECONDS` — sukut 60s) shu uchala navbatni
bosqichma-bosqich (`RECONCILIATION_BATCH_SIZE` — sukut 50, `updatedAt ASC`
tartibda) tekshiradi. Test muhitida (`config.isTest`) bu job RO'YXATDAN
O'TKAZILMAYDI — e2e testlar determinist bo'lishi uchun.

### Qo'lda reconciliation (staff)

- `GET /staff/reconciliation/summary` — stuck sonlar + ochiq anomaliyalar
  (severity bo'yicha).
- `GET /staff/reconciliation/anomalies` — filtrlanadigan/sahifalanadigan
  ro'yxat (`code`/`severity`/`entityType`/`resolved`/`since`).
- `POST /staff/reconciliation/anomalies/:id/acknowledge` — "ko'rib
  chiqildi" belgisi (HECH QANDAY moliyaviy maydonga tegmaydi).
- `POST /staff/reconciliation/payments/:id/reconcile` (xuddi shunday
  `refunds`/`payouts` uchun) — provider'dan SO'RAYDI va MAVJUD
  webhook-bilan-bir-xil state machine'ni ishga tushiradi. Staff HECH
  QACHON statusni to'g'ridan-to'g'ri o'rnata olmaydi — `POST
  /staff/ledger/fix` kabi endpoint UMUMAN YO'Q va bo'lmaydi.

Ikki marta bosish xavfsiz: mutatsiya CAS (`updateMany({where:{status:
PENDING|PROCESSING}})`) orqali exactly-once — ikkinchi chaqiruv
`NO_CHANGE`/`SKIPPED` qaytaradi, pul ikki marta harakatlanmaydi.

### Provider javobini qanday talqin qilish kerak

| Provider natijasi | Ma'no | Harakat |
|---|---|---|
| `PENDING`/`PROCESSING` | Hali hal bo'lmagan | Hech narsa (`NO_CHANGE`) |
| `SUCCEEDED`/`FAILED` | Avtoritativ | Mavjud webhook state-machine (CAS+ledger+audit+outbox) |
| `NOT_FOUND` | Provider referensni tanimayapti | **Darhol FAILED emas** — `PROVIDER_NOT_FOUND` (WARNING) anomaliya, qo'lda tekshirish |
| `UNKNOWN` | Javob keldi, lekin tasniflab bo'lmadi | `PROVIDER_STATUS_UNKNOWN` (WARNING) anomaliya, mutatsiya YO'Q |
| Tarmoq/timeout xatosi | Ambiguous — provider holati NOMA'LUM | Mutatsiya YO'Q, keyinroq qayta so'raladi |
| Config/auth xatosi (`PROVIDER_CONFIG_ERROR`) | Qayta urinish YORDAM BERMAYDI | Shu provider uchun JORIY batch to'xtatiladi (operator xabardor qilinishi kerak — credentials tekshirilsin) |

**Ziddiyat (masalan local `FAILED`, lekin provider endi `SUCCEEDED`
deydi)** — HECH QACHON avtomatik qabul qilinmaydi (terminal-holat
monotonligi): `TERMINAL_CONTRADICTION` (CRITICAL) anomaliya yoziladi,
ledgerga HECH NARSA yozilmaydi. Bunday holat rasmiy provider
qoidasi/hujjati bilan tasdiqlanmaguncha faqat QO'LDA (operator + moliya)
tekshiriladi.

### Moliyaviy yaxlitlik (integrity) anomaliyasi topilsa

`FinancialAnomaly` — DETECT + ESCALATE, avtomatik tuzatish YO'Q (§8'dagi
"ledger qatori hech qachon UPDATE qilinmaydi" bilan bir xil falsafa).
Anomaliya topilsa:

1. **Hech qanday qatorni qo'lda tahrirlama** (bo'lim 8'ga qarang).
2. `entityType`/`entityId` orqali tegishli Payment/Refund/Payout/
   Contract/Dispute yozuvini toping, `code`/`description`ni o'qing.
3. Agar bu **provider-so'rov vaqtidagi** anomaliya (`PROVIDER_NOT_FOUND`,
   `PROVIDER_STATUS_UNKNOWN`) bo'lsa — qayta `POST
   /staff/reconciliation/.../reconcile` bilan qo'lda urinib ko'ring
   (provider holati o'zgargan bo'lishi mumkin).
4. Agar bu **ledger-yaxlitlik** anomaliyasi (`SUCCEEDED_PAYMENT_WITHOUT_FUNDING`
   va sh.k.) bo'lsa — §8'dagi reversal-journal yo'lini ko'ring; hozircha
   avtomatik tuzatish YO'Q, qo'lda tekshirilib hujjatlashtiriladi.
5. Ko'rib chiqilgandan so'ng `POST
   /staff/reconciliation/anomalies/:id/acknowledge` bilan belgilang (bu
   FAQAT belgi — moliyaviy holatga ta'sir qilmaydi).

### Production preflight

```bash
npm run financial:check
```

Butun ilovani ko'taradi, `FinancialIntegrityService.scan()` (Bosqich
6/7/8/9'ning BARCHA mavjud tekshiruvlari) ishga tushiradi, natijani
JSON qilib chop etadi va **exit 0** (CRITICAL anomaliya YO'Q) yoki
**exit 1** (kamida bitta CRITICAL topildi) bilan chiqadi. CI/pre-deploy
pipeline'da shu exit code'ga qarab deploy to'xtatilishi mumkin.

**Diqqat — doimiy lokal dev DB'da "eski" anomaliyalar kutilgan bo'lishi
mumkin.** Masalan agar `bobododa` DB'da Bosqich 6 (ledger)dan OLDIN qo'lda
sinov uchun yaratilgan `COMPLETED` Contract qatorlari bo'lsa, ular
`CONTRACT_SETTLEMENT` journal'iga EGA BO'LMAYDI (chunki journal faqat
Bosqich 6+ kodida yoziladi) — bu **haqiqiy regressiya EMAS**, balki
ledger joriy etilishidan oldingi tarixiy holat. `financial:check` buni
ATAYLAB yashirmaydi (aks holda yangi, haqiqiy anomaliya ham
yashiringan bo'lardi) — operator `detectedAt` va tegishli
Contract/Payment `createdAt`ni solishtirib, sana Bosqich 6 migratsiyasidan
(`20260912150000_stage6_ledger`) OLDIN ekanini tasdiqlasa, bu ma'lum
tarixiy holat sifatida qabul qilinadi va `acknowledge` bilan belgilanadi.
**Fresh (yangi provisioned) DB'da — jumladan CI'ning `test:e2e`
muhitida — bunday tarixiy qatorlar UMUMAN YO'Q**, shuning uchun
`financial:check` u yerda har doim aniq (yolg'on bloklamaydi/yolg'on
o'tkazib yubormaydi) natija beradi.

## 10. Outbox worker + bildirishnoma yetkazish (Bosqich 10)

**Asosiy tamoyil (§2/§80): bildirishnoma yetkazish business tranzaksiya
to'g'riligiga HECH QACHON ta'sir qilmaydi.** `OutboxEvent` business
o'zgarish bilan BITTA DB tranzaksiyada yoziladi (Bosqich 1'dan buyon);
provider (SMS) chaqiruvi ESA doim tranzaksiya TASHQARISIDA — SMS provider
ishlamay qolsa ham Payment/Ledger/Contract COMMIT bo'lgan holicha qoladi.

### Arxitektura

```
Business tranzaksiya → OutboxEvent (PENDING)
        ↓ (BullMQ "uyg'otish" YOKI periodic sweep — DB authoritative)
OutboxWorkerService.claimBatch()   — FOR UPDATE SKIP LOCKED, qisqa tranzaksiya
        ↓ (tranzaksiya TASHQARISIDA)
RecipientResolverService → EVENT_ROUTES (routing jadvali) → shablon matni
        ↓
SmsProvider.send()   — tranzaksiya TASHQARISIDA
        ↓
OutboxWorkerService.finalize()   — qisqa tranzaksiya, claim token CAS bilan
        ↓
OutboxEvent.status = SENT | PENDING (retry) | DEAD | SKIPPED
+ OutboxDeliveryAttempt (append-only tarix)
```

`src/modules/notification/` — markaziy modul: `outbox-worker.service.ts`
(claim/deliver/finalize/retry/staff operatsiyalari),
`event-routing.constant.ts` (eventType → recipient → shablon, bo'lim 50),
`recipient-resolver.service.ts` (aggregat qatordan JORIY buyer/seller/user
kontekstini o'qiydi — payload EMAS, DB), `outbox.processor.ts`/
`outbox-scheduler.service.ts` (BullMQ, navbat nomi `outbox-delivery` —
Bosqich 9'ning `reconciliation` navbatidan MUSTAQIL).

### Holat modeli

`PENDING → PROCESSING → SENT` (muvaffaqiyatli) yoki `PENDING` (retryable
xato, backoff bilan) yoki `DEAD` (retry tugadi/permanent xato/noma'lum
event/versiya) yoki `SKIPPED` (bildirishnoma ATAYLAB yuborilmadi — qabul
qiluvchi yo'q yoki bu eventType uchun bildirishnoma umuman mo'ljallanmagan
— `EVENT_ROUTES`da `null`). **`DEAD` va `SKIPPED` FARQLANADI**: DEAD —
operator ko'rib chiqishi kerak bo'lgan muammo (provider/kod muammosi);
SKIPPED — kutilgan, muammosiz holat.

### Claim xavfsizligi — nega hech qachon ikki marta yubormaydi (deyarli)

- Claim — BITTA SQL: `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP
  LOCKED LIMIT N)` — parallel worker'lar bir xil qatorni OLOLMAYDI.
- Har claim BITTA tasodifiy `processingToken` oladi. **Finalize FAQAT shu
  token hali ustunda TURGAN bo'lsa muvaffaqiyatli** (`WHERE id=? AND
  processingToken=?`) — kech qolgan/qotib qolgan worker (masalan tarmoq
  sekinlashuvi tufayli) o'zining ESKI natijasi bilan boshqa worker
  allaqachon yozgan YANGI holatni EZIB YUBORA OLMAYDI.
- `OUTBOX_PROCESSING_TIMEOUT_SECONDS` (sukut 120s) — worker crash bo'lsa
  qator abadiy PROCESSING'da qolmaydi, muddat o'tgach boshqa worker uni
  qayta claim qiladi.
- **Bitta haqiqiy chegara (documented, hal qilib bo'lmaydigan)**: agar
  ESKI worker aynan lease muddati ichida (hali stale hisoblanmasdan)
  provider'ga chaqiruv yuborgan bo'lsa VA provider xabarni HAQIQATAN
  yetkazgan bo'lsa, lekin javob keyin (lease tugagach) qaytsa — xabar
  provider tomonidan YETKAZILGAN, lekin bizning tizim buni "stale" deb
  rad etadi va qator boshqa worker tomonidan QAYTA claim qilinib, YANA
  yuborilishi mumkin. Bu — **kamdan-kam, lekin nazariy jihatdan mumkin
  bo'lgan duplikat SMS holati** (bo'lim 33/80's "provider timeout = aniq
  yuborilmadi degani emas" — buning teskarisi ham to'g'ri: "aniq
  yuborilgan" degani ham EMAS). SMS provider (Eskiz/PlayMobile va
  o'xshashlar) odatda client-tomonidan berilgan idempotency kalitini
  QO'LLAB-QUVVATLAMAYDI — shuning uchun "exactly-once notification"
  KAFOLATI BERILMAYDI, faqat **at-least-once delivery attempt +
  provider-tomonidan-mumkin-bo'lsa idempotent qabul qilish** (bo'lim 3).
  `OutboxEvent.id` har doim BARQAROR reference sifatida uzatiladi
  (`SmsProvider.send(..., { reference: outboxEvent.id })`) — real provider
  buni qo'llab-quvvatlasa, duplikat xavfi YO'QOLADI.

### Retry siyosati

| Klassifikatsiya | Misol | Natija |
|---|---|---|
| Retryable | tarmoq xatosi, provider 5xx, istisno/timeout | `PENDING`, eksponensial backoff (`OUTBOX_RETRY_BASE_SECONDS` — sukut 30s, `OUTBOX_RETRY_MAX_SECONDS` — sukut 3600s, ±15% jitter) |
| Permanent | provider "yaroqsiz raqam" kabi aniq javob | DARHOL `DEAD`, retry qilinmaydi |
| Noma'lum eventType/payloadVersion | deploy skew, kod hali yangilanmagan | DARHOL `DEAD` — operator ko'rishi kerak, "jim muvaffaqiyatli" ko'rinmaydi |
| Shablon uchun kerakli maydon yo'q | masalan `title`/`amount` topilmadi | DARHOL `DEAD` (qayta urinish ma'lumotni yaratmaydi) |
| Max attempts tugadi (`OUTBOX_MAX_ATTEMPTS` — sukut 6) | ketma-ket retryable xatolar | `DEAD`, `lastErrorCode=MAX_ATTEMPTS_EXHAUSTED` |

**Hech qachon**: vaqt o'tgani UCHUNGINA (masalan uzoq PENDING) avtomatik
`DEAD`/`FAILED` qilinmaydi — faqat YUQORIDAGI ANIQ klassifikatsiya
asosida. Staff HAM statusni to'g'ridan-to'g'ri "SENT" qila olmaydi (bo'lim
29) — `POST /staff/outbox/:id/retry` faqat `DEAD`/`SKIPPED`ni `PENDING`ga
qaytaradi, keyingi haqiqiy claim/deliver siklidan o'tadi.

### DEAD/SKIPPED topilsa (staff)

1. `GET /staff/outbox?status=DEAD` — muammoli qatorlarni ko'ring.
2. `GET /staff/outbox/:id` — `lastErrorCode`/`lastError` va
   `deliveryAttempts` tarixini o'qing (`UNSUPPORTED_EVENT`/
   `UNSUPPORTED_PAYLOAD_VERSION` — kod muammosi, deploy tekshiring;
   `PERMANENT_PROVIDER_FAILURE`/`MAX_ATTEMPTS_EXHAUSTED` — provider holatini
   tekshiring).
3. Muammo hal bo'lgach (masalan yangi deploy bilan kod tuzatildi) —
   `POST /staff/outbox/:id/retry`.
4. `SKIPPED` odatda muammo EMAS (masalan bu eventType uchun bildirishnoma
   ataylab yo'q) — faqat `RECIPIENT_MISSING` bilan `SKIPPED` bo'lgan va
   endi haqiqatan qabul qiluvchisi bor (masalan foydalanuvchi ma'lumoti
   tuzatildi) qatorlarni qayta ishga tushiring.

### Redis o'chib qolsa

Business oqim (Payment/Contract/... yozish) Redis'ga UMUMAN BOG'LIQ EMAS —
`OutboxEvent` DB'da xavfsiz qoladi. Faqat **avtomatik** yetkazish
to'xtaydi (BullMQ signal yo'q); Redis qaytgach:
- Repeatable job (`outbox-sweep`, `OUTBOX_SWEEP_INTERVAL_SECONDS` — sukut
  30s) o'z-o'zidan davom etadi VA
- DB'dagi `PENDING`/eskirgan `PROCESSING` qatorlar HECH QACHON yo'qolmagan
  — keyingi claim ularni topadi (queue signal — faqat "uyg'otish",
  authoritative manba emas).

OTP SMS (`OTP_SMS_QUEUE`) BUTUNLAY ALOHIDA navbat/oqim — bu bo'lim unga
tegishli emas (Bosqich 2'dan o'zgarishsiz).

### Tarixiy backlog (deploy paytida MAJBURIY qadam)

Bosqich 1-9 davomida yozilgan, hali `PENDING` turgan `OutboxEvent`
qatorlari bor (masalan doimiy dev DB'da — bu haqiqatda tekshirilgan: bu
loyihaning o'zida ~22 ta shunday qator topilgan). Agar worker/scheduler
ULARNI TO'G'RIDAN-TO'G'RI ishga tushirilsa, ular BIRDAN haqiqiy
foydalanuvchilarga oylar oldingi ("shartnomangiz yaratildi" kabi)
bildirishnoma sifatida ketishi MUMKIN — bu YOMON, chalkash tajriba.

**Production deploy'da, worker/scheduler ko'tarilishidan OLDIN, BIR
MARTA**:

```bash
npm run outbox:cutover -- --dry-run   # avval qancha qator ta'sirlanishini ko'ring
npm run outbox:cutover                # haqiqatan SKIPPED qiladi (lastErrorCode=HISTORICAL_BACKLOG_CUTOFF)
```

Bu — ONGLI, BIR MARTALIK, auditable operatsiya (doimiy "cutoff sanasi"
konfiguratsiyasi YO'Q — shu orqali worker'ning kundalik claim so'rovi
abadiy murakkablashmaydi). Skript idempotent: qayta ishga tushirilsa
faqat hali `PENDING` qolganlarni topadi (allaqachon `SKIPPED`
qilinganlarga tegmaydi).

### SMS provider — production fail-closed

`SMS_PROVIDER=CONSOLE` (real SMS yubormaydi) — `PAYMENT_PROVIDER`/
`PAYOUT_PROVIDER` bilan BIR XIL fail-closed qatlam: production'da boot
RAD ETILADI (`sms.module.ts`ning factory'si). OTP va generic
bildirishnoma BIR XIL `SMS_PROVIDER`ni bo'lishadi (bo'lim 12) — real
Eskiz/PlayMobile integratsiyasi hali YO'Q (spetsifikatsiya repo/docs'da
yo'q, o'ylab topilmaydi).

### i18n — hozircha faqat o'zbekcha

`User` modelida `locale` maydoni UMUMAN YO'Q — foydalanuvchining
qaysi tilni afzal ko'rishini ANIQLASHNING hech qanday yo'li yo'q.
Shablonlar (`event-routing.constant.ts`) shuning uchun HOZIRCHA FAQAT
o'zbek tilida — aralash-tilli yoki noto'g'ri taxmin qilingan xabar
yuborishdan ko'ra bitta izchil til afzal. RU/EN kerak bo'lsa: (1) `User`ga
`locale` ustuni qo'shiladi, (2) shablon funksiyalari `Locale` parametr
qabul qiladi.

## 11. Staff/admin operatsiyalari + TOTP boshqaruvi (Bosqich 11)

### Staff lifecycle

`StaffMember.status` (`ACTIVE`/`SUSPENDED`/`DISABLED`) — Bosqich 2'dagi
`isActive: Boolean`ni almashtirdi (`UserStatus` bilan bir xil naqsh).
`StaffPermissionGuard` HAR so'rovda LIVE tekshiradi (`status !== 'ACTIVE'`
— ikkalasi ham bir xil natija: `ACCOUNT_BLOCKED`, 403) — eski access token
15 daqiqalik muddati ichida ham HECH narsa qila olmaydi. Hard delete YO'Q
(`DISABLED` — AuditLog actor tarixi buzilmasin).

**`SUPER_ADMIN` roli** endi haqiqatan majburlanadi (`@RequireRole('SUPER_ADMIN')`,
`StaffPermissionGuard`ning bir qismi — LIVE DB'dan, JWT claim'idagi
`role`ga ISHONILMAYDI). Faqat ikkita amal talab qiladi:
`POST /staff/admin/staff-members` (yangi staff yaratish) va
`PATCH .../permissions` (ruxsat o'zgartirish) — yangi imkoniyat berish
oddiy moderatsiyadan (suspend/disable/reactivate — faqat `STAFF` huquqi)
yuqori ishonch talab qiladi (ADR-05'dagi "SETTINGS + SUPER_ADMIN" naqshi
bilan bir xil falsafa).

**O'z-o'zini cheklash/oshirish TAQIQLANGAN**: staff o'zining permissionlarini
o'zi o'zgartira olmaydi, o'zini-o'zi suspend/disable qila olmaydi (403,
`targetId === actor.id` tekshiruvi). **Oxirgi faol `SUPER_ADMIN`ni
suspend/disable qilish TAQIQLANGAN** (`LAST_ADMIN_PROTECTED`, 409) —
platformani boshqaruvchisiz qoldirish imkonsiz.

### TOTP — enrollment, shifrlash, replay himoyasi

Oqim: `POST /staff/me/totp/enroll` (sir generatsiya qilinadi,
`pendingTotpSecret`ga — HALI FAOL EMAS) → `POST /staff/me/totp/verify`
(to'g'ri kod bersa, `pendingTotpSecret` → `totpSecret`ga ko'chiriladi,
`mfaEnabled=true`). **Sir FAQAT verify qilingandan keyin active bo'ladi**
— yarim tugallangan enrollment eski MFA holatiga (yoki uning yo'qligiga)
ta'sir qilmaydi.

**At-rest shifrlash**: `totpSecret`/`pendingTotpSecret` AES-256-GCM bilan
shifrlangan (`totp-secret-cipher.util.ts`, format `v1:<iv>:<authTag>:<ciphertext>`,
hammasi hex). Kalit — `STAFF_TOTP_ENCRYPTION_KEY` (64 hex belgi/32 bayt),
`JWT_*_SECRET` bilan BIR XIL qatlam: **HAR DOIM majburiy** (dev/test/prod),
yo'q bo'lsa boot BUTUNLAY BO'LMAYDI (Zod env validatsiyasi). Generatsiya:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Migratsiya xavfsizligi** (bo'lim 58): deploy paytida DB'da PLAINTEXT
`totpSecret` qatorlari bo'lishi MUMKIN emas edi (tekshirilgan — bu loyihada
enrollment endpoint Bosqich 11'gacha UMUMAN yo'q edi, shuning uchun
`mfaEnabled=true` bilan haqiqiy qator yo'q). Shunga qaramay migratsiya
himoya sifatida (agar boshqa muhitda bo'lsa) `totpSecret IS NOT NULL`
qatorlarni `NULL`ga tushiradi (`mfaEnabled=false`) — bunday hisob qayta
enroll qilishi kerak bo'ladi, lekin login BUTUNLAY bloklanib qolmaydi.

**Replay himoyasi** (RFC 6238 tavsiyasi): `StaffMember.lastTotpCounter` —
oxirgi MUVAFFAQIYATLI qabul qilingan HOTP counter. Undan KATTA bo'lmagan
counter CAS bilan rad etiladi — bitta kod ikki marta (parallel so'rovlarda
ham) ISHLATIB BO'LMAYDI: ikkita bir xil kodli PARALLEL login/enrollment-
verify/disable so'rovidan FAQAT BITTASI g'olib chiqadi.

**TOTP brute-force**: login'dagi 2FA tekshiruvi, enrollment-verify VA
disable — HAMMASI BITTA `RateLimiterService` hisoblagichini bo'lishadi
(`staff-totp:<staffId>`, sukut 5 urinish / 5 daqiqa) — chegaradan o'tsa
`RATE_LIMITED` (429).

**Yo'qolgan qurilma/administrator TOTP'ni tiklay olmasa**:
`POST /staff/admin/staff-members/:id/totp/reset` (`STAFF` huquqi) — MFA'ni
o'chiradi VA **barcha** sessiyalarni bekor qiladi (xavfsizlik: "yo'qolgan
qurilma" stsenariysida eski sessiya ham yopiladi). Admin sirni HECH QACHON
ko'rmaydi/bilmaydi — faqat "reset" so'raydi, keyingi login parol bilan
(MFA'siz) ishlaydi, foydalanuvchi o'zi qayta enroll qiladi. Recovery
kodlar YO'Q (bo'lim 14 — hozircha talab qilinmagan, admin reset yetarli).

### Parol — o'zgartirish/reset

`POST /staff/me/change-password` — joriy parol tekshiriladi, muvaffaqiyatli
bo'lsa **boshqa** (joriy sessiyadan tashqari) barcha sessiyalar bekor
qilinadi. `POST /staff/admin/staff-members/:id/password-reset` — admin
YANGI DOIMIY parolni HECH QACHON bilmaydi: tizim tasodifiy vaqtinchalik
parol yaratadi (`tempPassword`, FAQAT shu javobda bir marta), barcha
sessiyalarni bekor qiladi, `mustChangePassword=true` qo'yadi. Bu flag
HECH QANDAY endpointni QATTIQ bloklamaydi (bo'lim 4 — "minimal secure
flow": admin temp parolni xavfsiz kanaldan uzatadi deb ishoniladi) — faqat
login/`GET /staff/me` javobida ko'rinadi, client "parolni almashtiring"
degan yumshoq signal ko'rsatishi mumkin.

Parol siyosati: uzunlik 10–128 (Argon2 DoS himoyasi uchun MAX muhim),
faqat-bo'sh-joy taqiqlangan. Composition-fetish qoidalar (majburiy katta
harf/raqam/belgi) YO'Q — docs talab qilmagan.

### Login brute-force himoyasi

Staff login — per-email VA per-IP (`RateLimiterService`, sukut 10/15daqiqa
email bo'yicha, 30/15daqiqa IP bo'yicha) — parol tekshirishdan OLDIN,
email mavjud/mavjud-emasligidan QAT'I NAZAR (enumeration-safe: ikkalasi
ham bir xil `RATE_LIMITED` javob beradi).

### AuditLog — endi operatsion API

`GET /staff/audit-logs` (`AUDIT` huquqi) — filtrlar FAQAT indekslangan
maydonlar bo'yicha (`actorType`/`actorId`/`action`/`resourceType`+
`resourceId`/`requestId`/sana oralig'i) — **`previousState`/`newState`
ICHIDA erkin JSON qidiruv YO'Q** (unbounded, indekslanmagan — performance
xavfi). Javobda `previousState`/`newState` qo'shimcha DEFENSIV filtrdan
o'tadi (`audit-redaction.util.ts` — kalit nomi `password`/`secret`/
`totp`/`token`/`hash` ga mos kelsa `[REDACTED]`), garchi yozuvchilar
(barcha `audit.record()` chaqiruvchilar) allaqachon sir qo'ymaslik
intizomiga rioya qilsa ham — bu ikkinchi, DEFENSIV qatlam. Append-only —
bu API FAQAT o'qish, `AuditService.record()` yagona yozish yo'li bo'lib
qoladi.

### User/Seller admin ko'rinishi

`GET /staff/users`, `GET /staff/users/:id` (bounded COUNT'lar — contracts/
payments soni, giant Prisma `include` YO'Q), `GET /staff/sellers`,
`GET /staff/sellers/:id` (services/contracts/payouts/disputes soni) — HAR
DOIM `passwordHash` VA boshqa sir maydonlarsiz.

**`POST /staff/users/:id/block` endi ATOMIK**: `User.status=BLOCKED` +
BARCHA faol `RefreshToken`larni bekor qilish + audit + `USER_BLOCKED`
Outbox hodisasi — BITTA tranzaksiyada. Avval faqat `AccountStatusGuard`
LIVE tekshiruviga ishonilar edi (keyingi so'rovda rad etiladi) — endi
QO'SHIMCHA ravishda eski refresh token'ning O'ZI ham darhol ishlamay
qoladi (ikkala qatlam). `SELLER_SUSPENDED` xuddi shunday Outbox hodisasi
yozadi. **Diqqat**: yangi Outbox `eventType` qo'shsangiz `EVENT_ROUTES`
(`src/modules/notification/event-routing.constant.ts`) da RO'YXATDAN
O'TKAZILISHI SHART — aks holda worker uni `UNSUPPORTED_EVENT` deb `DEAD`
qilib qo'yadi (production'ga "jim" chiqib ketmaydi, lekin bildirishnoma
HAM yetmaydi).

### Moderatsiya kuchaytirish

`POST /staff/services/:id/force-pause` (`SERVICES` huquqi, sabab MAJBURIY)
— faol xizmatni FAVQULODDA to'xtatadi (masalan xavfli/shikoyat qilingan).
Sotuvchining o'z `pause()`idan FARQLI — BIR XIL `PAUSED` maqsad holatiga
o'tadi (yangi status YO'Q), lekin alohida audit action
(`SERVICE_FORCE_PAUSED`) bilan — "kim to'xtatdi" tarixda ANIQ.

### Moliyaviy xavfsizlik chegarasi — o'zgarmadi

Bosqich 11 **hech qanday** yangi payment/ledger mutatsiya yo'li
QO'SHMAYDI. Staff HALI HAM: to'lov statusini qo'lda SUCCEEDED qila
olmaydi, ledger yozuv yarata/o'zgartira olmaydi, refund'ni qo'lda
"muvaffaqiyatli" deb belgilay olmaydi. Barcha moliyaviy operatsiyalar
FAQAT mavjud Refund/Dispute/Reconciliation workflow'lari orqali (Bosqich
7/8/9, o'zgarishsiz).

## 12. Real Payme integratsiyasi + production launch hardening (Bosqich 12)

### mustChangePassword — endi HARD GATE

Bosqich 11'da faqat "soft signal" edi (javobda ko'rinardi, hech narsani
bloklamasdi). Endi `StaffPermissionGuard` HAR bir so'rovda live tekshiradi:
`mustChangePassword=true` bo'lsa faqat `@AllowWhenPasswordChangeRequired()`
bilan belgilangan endpointlar ishlaydi — `GET /staff/me`,
`POST /staff/me/change-password`, TOTP enrollment/verify/disable oqimi
(`POST /staff/auth/logout` alohida guard'da, tegilmagan). Qolgan HAR
QANDAY `/staff/*` `PASSWORD_CHANGE_REQUIRED` (403) bilan rad etiladi —
permission tekshiruvidan KEYIN (staff huquqi yetarli bo'lsa ham baribir
bloklanadi). Parol muvaffaqiyatli almashtirilsa flag atomik tarzda
`false`ga tushadi (mavjud "boshqa sessiyalarni bekor qilish" xatti-harakati
o'zgarishsiz). Admin `password-reset` HAMON flag'ni `true` qiladi.

### Payme Merchant API — rasmiy protokol

Manba: `developer.help.paycom.uz` (Metody Merchant API + Protokol
Merchant API bo'limlari). Real integratsiya `src/modules/payment/providers/payme/`
papkasida:

- **Dedicated JSON-RPC endpoint** — `POST /api/v1/payments/payme` (generic
  `POST /payments/webhooks/:provider`dan ALOHIDA — Payme's protokoli
  webhook emas, to'liq JSON-RPC bitta endpoint orqali). Javob HAR DOIM
  HTTP 200, `{result}` yoki `{error}` (rasmiy spec).
- **Auth** — Basic HTTP (`Authorization: Basic base64(login:key)`),
  timing-safe solishtirish (`payme-basic-auth.util.ts`). `PAYME_MERCHANT_CONFIG`
  DI token (`payment.module.ts`) — `PAYMENT_PROVIDER=PAYME` VA to'liq
  credential (`PAYME_MERCHANT_ID`/`PAYME_LOGIN`/`PAYME_KEY`/`PAYME_CHECKOUT_URL`)
  bo'lmasa `null` (RPC controller `-32601` bilan "mavjud emas" ko'rsatadi
  — ichki konfiguratsiya holati oshkor qilinmaydi).
- **Metodlar** — `CheckPerformTransaction`, `CreateTransaction` (idempotent,
  DB `@@unique([paymentId])`/`@@unique([paymeTransactionId])` orqali CAS —
  10 parallel bir xil so'rov → aniq BITTA qator), `PerformTransaction`
  (idempotent — Payme javobi yo'qolib qayta yuborsa ham funding BIR MARTA),
  `CancelTransaction`, `CheckTransaction` (persistent snapshot, qayta
  hisoblamaydi), `GetStatement` (bounded, `createTime` bo'yicha ascending).
- **Transaksiya modeli** — YANGI `PaymeTransaction` jadvali (protokol
  holati: `state` 1/2/-1/-2), `PaymentStatus`dan ATAYLAB ALOHIDA. Pul
  harakati (SUCCEEDED/CANCELLED) HAR DOIM `PaymentService`ning mavjud
  authoritative metodlari orqali (`attachProviderReference()`/
  `applyProviderRpcStatus()`) — yangi ledger kod YOZILMAGAN.
- **Checkout** — Payme'da merchant→provider "create payment" HTTP chaqiruvi
  YO'Q (foydalanuvchi Payme'ning GET-checkout sahifasiga redirect qilinadi:
  `<checkout_url>/base64("m=...;ac.payment_id=...;a=...")`). Shuning uchun
  `PaymentProvider` interfeysi kengaytirildi: `createPayment`/`buildCheckoutUrl`
  IKKALASI HAM ixtiyoriy (capability-based) — TEST provider eskisidek
  `createPayment` ishlatadi, Payme faqat sinxron `buildCheckoutUrl`ni.
  `POST /me/contracts/:id/payment` javobi endi ixtiyoriy `checkoutUrl`
  qaytaradi (faqat yaratish javobida — keyingi GET'larda YO'Q, bo'lim 25:
  browser redirect status manbai EMAS).
- **CancelTransaction — moliyaviy xavfsizlik (ENG MUHIM qism)**: performed
  bo'lmagan (state=1) transaksiyani bekor qilish xavfsiz — `Payment`
  PENDING/PROCESSING → CANCELLED (ledger'ga hech qachon tegilmaydi).
  **ALLAQACHON performed (state=2, Payment SUCCEEDED, ledger funding
  YOZILGAN) bo'lsa — HAR DOIM rad etiladi** (rasmiy `-31007`, "buyurtma
  to'liq bajarilgan"). Avtomatik reversal YO'Q — bu ATAYLAB qaror
  (financial correctness > convenience): Payment/Ledger qatori HECH
  QACHON bu yo'l orqali o'zgarmaydi, faqat audit yoziladi
  (`PAYME_CANCEL_AFTER_PERFORM_REFUSED`). Haqiqiy pul qaytarish kerak
  bo'lsa — staff MAVJUD `RefundService` oqimidan qo'lda boshlaydi.
- **Merchant-initiated refund YO'Q**: rasmiy Payme Merchant API'da
  merchant → provider "refund" HTTP metodi UMUMAN yo'q (faqat inbound
  CancelTransaction, state=1 uchun). `PaymeProvider.refundPayment()`
  shuning uchun DETERMINISTIK `PAYMENT_PROVIDER_ERROR` bilan rad etadi —
  `RefundService` buni allaqachon to'g'ri qayta ishlaydi (Refund PENDING
  → FAILED, aniq sabab bilan).
- **Reconciliation** — Payme'da merchant → provider "query" metodi YO'Q
  (`GetStatement` — TESKARI yo'nalish, Payme bizdan so'raydi). Shuning
  uchun `PaymeProvider.queryPayment` ATAYLAB implement qilinmagan —
  `ReconciliationService` buni allaqachon gracefully o'tkazib yuboradi
  (bo'lim 26/27 — fake query endpoint yaratilmagan).

### CLICK — BLOCKED_BY_OFFICIAL_SPEC

`docs.click.uz` texnik sahifalari (Merchant API/Shop API so'rovlar,
signature formulasi, xato kodlari) bu muhitda JS-render qilinadigan SPA
bo'lgani uchun statik fetch orqali o'qib bo'lmadi (faqat navigatsiya
qobig'i qaytdi). Rasmiy protokol TASDIQLANMAGANI uchun CLICK implement
QILINMADI (o'ylab topilmadi) — `PAYMENT_PROVIDER=CLICK` hamon HAR QANDAY
muhitda boot'ni rad etadi (Bosqich 5'dan beri o'zgarmagan fail-closed
yo'l, `payment.module.ts`). Rasmiy spetsifikatsiya keyinroq tekshirilsa,
shu joyga `providers/click/` (Payme bilan bir xil naqsh) qo'shiladi.

### Provider cutover checklist (real Payme'ga o'tish)

```text
[ ] PAYMENT_PROVIDER=TEST HECH QANDAY production muhitda YO'Q
[ ] PAYME_MERCHANT_ID / PAYME_LOGIN / PAYME_KEY / PAYME_CHECKOUT_URL
    production secret manager'da (real qiymatlar, Payme Business
    kabinetidan)
[ ] PAYME_CHECKOUT_URL = https://checkout.paycom.uz (production, test emas)
[ ] Endpoint URL Payme Business kabinetida bizning production domenga
    (https://<domain>/api/v1/payments/payme) ko'rsatilgan, HTTPS orqali
    tashqi tarmoqdan REACHABLE
[ ] Sandbox (https://test.paycom.uz) orqali to'liq oqim qo'lda tekshirilgan
    (pastdagi "Sandbox verification" bo'limi)
[ ] npm run financial:check — CRITICAL anomaliya yo'q
[ ] npm run production:check — 0 exit
[ ] Birinchi haqiqiy tranzaksiyadan keyin PaymeTransaction/Payment/Ledger
    qatorlari qo'lda tekshirilgan (staff panel yoki to'g'ridan-to'g'ri DB)
```

### Sandbox verification

Real Payme sandbox credential mavjud bo'lmagani uchun bu sessiyada
sandbox oqimi QO'LDA ishga tushirilmadi — `PAYME_SANDBOX = NOT_RUN`
(ochiq yozilgan, PASS deb ko'rsatilmagan). Protokol darajasidagi
to'g'rilik `test/payme.e2e-spec.ts` (26 test — auth, CheckPerform/Create/
Perform/Cancel/Check/GetStatement, 3 xil concurrency stsenariysi, cancel
moliyaviy xavfsizligi) orqali REAL Postgres bilan tasdiqlangan — bu
Payme sandbox'ining O'ZI EMAS, lekin bizning tomondagi implementatsiya
rasmiy protokolga mos ekanligining dalili. Sandbox credential paydo
bo'lganda: yuqoridagi cutover checklist'ni sandbox URL bilan bajaring va
shu bo'limni `PAYME_SANDBOX = PASS` (yoki topilgan muammo bilan `FAIL`)
ga yangilang.

### Production hardening (bo'lim 37-49)

- **CORS** — `CORS_ORIGINS` (allowlist, vergul bilan ajratilgan) allaqachon
  Bosqich 1'dan beri mavjud edi, `origin:'*'` HECH QACHON ishlatilmagan —
  o'zgarishsiz tasdiqlandi.
- **Trust proxy** — YANGI `TRUST_PROXY` env (`main.ts`, sukut `"false"`).
  Reverse proxy (Railway/Nginx/Cloudflare) ortida `req.ip` to'g'ri
  o'qilishi kerak bo'lsa `"true"` (hammasiga ishonish, FAQAT proxy
  tarmog'i to'liq nazorat qilinsa) yoki konkret hop-soni/CIDR ro'yxati
  bilan sozlang — ko'r-ko'rona sukut YO'Q.
- **Body limit** — global JSON/urlencoded chegarasi `1mb`
  (`app.useBodyParser`) — provider RPC payload'lari doim kichik.
- **Graceful shutdown** — `app.enableShutdownHooks(['SIGTERM','SIGINT'])`
  (aniq signallar). BullMQ `WorkerHost`lar (Outbox/Reconciliation)
  `@nestjs/bullmq` orqali avtomatik yopiladi — yangi kod shart emas edi,
  faqat signal ro'yxati aniqlashtirildi.
- **Swagger/TEST provider/DB role assertion** — Bosqich 1-9'dan beri
  mavjud fail-closed himoyalar o'zgarishsiz qayta tasdiqlandi.
- **Secrets** — `.env.example` FAQAT placeholder, real qiymat HECH QACHON
  commit qilinmagan (tekshirilgan).

### Backup strategiyasi

```text
Nima:      PostgreSQL 16 to'liq baza (jumladan ledger_transactions/
           ledger_entries/audit_logs/payme_transactions/payment_provider_events)
Qachon:    kuniga kamida 1 marta to'liq snapshot + agar provider qo'llasa
           WAL/PITR (point-in-time recovery) — managed Postgres (RDS/Cloud
           SQL/Supabase/Neon) odatda buni AVTOMATIK taqdim etadi
Qayerda:   provider-managed encrypted storage (masalan RDS automated
           backups, Cloud SQL backups) — provider documentation'iga qarang
Retention: kamida 7 kunlik kunlik snapshot + 4 haftalik haftalik
           (moliyaviy ma'lumot — qisqa retention YETARLI EMAS)
RPO:       ≤24 soat (kunlik snapshot) — WAL/PITR mavjud bo'lsa ≤5 daqiqa
RTO:       ≤2 soat (yangi instance'ga restore + DNS/connection almashtirish)
```

**Diqqat**: yuqoridagi jadval REJA — backup borligini restore SINAMASDAN
tasdiqlamang (pastdagi restore drill).

### Restore drill (staging/test'da, production DATA'siga TEGMASDAN)

```text
1. Eng so'nggi backup/snapshot'ni aniqlang (provider konsoli/CLI)
2. YANGI, IZOLYATSIYALANGAN DB instance'ga restore qiling (production
   instance'ni QAYTA YOZMANG)
3. `npx prisma migrate deploy` — restore qilingan schema joriy
   migratsiyalar bilan mos kelishini tasdiqlang (agar restore ESKI
   snapshot bo'lsa, keyingi migratsiyalar shu yerda qo'llanadi)
4. Kritik jadval qatorlar sonini solishtiring (`payments`, `ledger_transactions`,
   `ledger_entries`, `audit_logs`, `payme_transactions`) — kutilmagan
   0/juda kichik son = restore muvaffaqiyatsiz
5. `npm run financial:check` — restore qilingan DB'ga qarshi (ledger
   balans invarianti, dispute integrity)
6. Natijani (muvaffaqiyat/sana/davomiylik) shu bo'limga yozib qo'ying —
   keyingi drill solishtirish uchun
```

Ledger/Audit — **eng KRITIK** backup ustuvorligi (`ledger_transactions`,
`ledger_entries`, `audit_logs`, `payme_transactions`, `payment_provider_events`,
`refund_provider_events`, `payout_provider_events`) — bular APPEND-ONLY
(A4, `db-role-assertion.ts`), shuning uchun tabiiy ravishda "point-in-time"
konsistent: restore qilingan nusxada bu jadvallarning HAR BIR qatori
haqiqiy tarixiy voqea (keyinchalik o'zgartirilmagan).

### Deployment ketma-ketligi (tavsiya, platform-agnostik)

```text
1. build (npm run build)
2. migration preflight — `npx prisma migrate status` (yangi migratsiya
   bormi, joriy schema bilan mos keladimi)
3. npx prisma migrate deploy — MIGRATOR rol bilan (RUNBOOK §3)
4. npm run financial:check — CRITICAL anomaliya bo'lsa DEPLOY TO'XTAYDI
5. npm run production:check — env/provider/DB rol/Redis tekshiruvi
6. yangi versiyani ishga tushirish (rolling/blue-green — platformaga bog'liq)
7. /health/ready → 200 tasdiqlash
8. (agar fresh production bo'lsa) npm run outbox:cutover — eski backlog
   siyosati (Bosqich 10 RUNBOOK §10'da batafsil)
```

**Zero-downtime migratsiya qoidasi**: bitta deploy'da eski kod HALI
ishlatayotgan ustun/jadvalni DROP qilmang (expand/contract naqshi —
avval YANGI ustun/jadval QO'SHILADI va eski kod bilan BIRGA ishlaydi
keyingi deploy'gacha, keyin ALOHIDA migratsiyada eski ustun olib
tashlanadi). Bosqich 1-12'dagi barcha migratsiyalar shu qoidaga rioya
qildi (masalan Bosqich 11'da `isActive` faqat YANGI `status` ustuni
to'liq migratsiya qilingandan KEYIN, BIR XIL migratsiya ichida
o'chirilgan — chunki bu ustun runtime kodda faqat SHU deploy ichida
almashtirilgan, eski kod bilan parallel ishlash talab qilinmagan).

### Secret rotation

```text
JWT_ACCESS_SECRET / JWT_STAFF_ACCESS_SECRET:
  Yangi qiymat qo'yish — barcha MAVJUD access token'lar (qisqa TTL,
  15m) tabiiy eskiradi, qayta login talab qilinadi. Downtime YO'Q.

STAFF_TOTP_ENCRYPTION_KEY:
  ROTATSIYA QILIB BO'LMAYDI joriy formatda (`v1:` versiya prefiksi
  KELAJAKDAGI kalit-versiyalash uchun tayyorlangan, lekin hozircha
  registry YO'Q). Kalitni almashtirish MAVJUD shifrlangan TOTP
  sirlarini o'qib bo'lmaydigan qiladi — bajarilsa, BARCHA staff
  `adminResetTotp()` orqali qayta enrollment qilishi SHART (bo'lim 58).

Payme PAYME_KEY:
  Payme Business kabinetida yangi kalit generatsiya qiling → avval
  YANGI kalitni production secret'ga yozing va deploy qiling → Payme
  Business kabinetida ESKI kalitni bekor qiling. Downtime YO'Q (bir xil
  paytda ikkala kalit amal qiladigan oyna bor).

DB parol (bobododa_app / bobododa_migrator):
  `ALTER ROLE ... PASSWORD` (yangi parol) → `DATABASE_URL`/
  `DATABASE_MIGRATION_URL` secret'ni yangilang → rolling restart.
  Eski parol connection pool tugagach ishlamay qoladi — qisqa oyna.

PLAYMOBILE_PASSWORD:
  PlayMobile shaxsiy kabinetida yangi parol → `PLAYMOBILE_PASSWORD`
  secret'ni yangilang → restart. Downtime qisqa (restart vaqti) — eski
  parol darhol ishlamay qoladi (Basic auth, sessiya/token YO'Q).
```

### Production readiness — to'liq checklist

`docs/PRODUCTION-READINESS.md` — provider credential'lardan tortib
rollback rejasigacha to'liq ro'yxat.

### `npm run production:check`

Real tashqi tranzaksiya QILMAYDI — faqat: env valid (Zod), TEST/CONSOLE
provider'lar production'da rad etilishi, DB rol assertioni, migratsiya
holati joriy, `financial:check`, Redis reachable, kritik config maydonlar
mavjudligini tekshiradi. Exit 0 = launch check o'tdi, boshqa = bloklangan.

## 13. Real SMS (PlayMobile) + payout feature-gate + launch closure (Bosqich 13)

### SMS — PLAY MOBILE SMS-Broker HTTP API

Manba: rasmiy PDF (`playmobile.uz/instruction/` → "HTTP Protocol" havolasi,
`playmobile.uz/storage/2022/08/http.pdf`, 2026-09 holatiga ko'ra
tekshirilgan — konfidensial ichki hujjat, repo'ga NUSXA SAQLANMAGAN).
Eskiz — rasmiy Postman documenter sahifasi JS-render qilinadigan SPA
bo'lib chiqdi (statik fetch faqat sarlavhani qaytardi), implement
QILINMADI.

- **Auth** — Basic (`Authorization: Basic base64(login:password)`).
- **`POST <PLAYMOBILE_API_URL>/send`** — `sms.originator`/`sms.content.text`
  + `messages: [{recipient, message-id}]`. `recipient` — `9989xxxxxxx`
  (E.164'dan `+` olib tashlanadi, faqat shu provider uchun).
- **`message-id`** — BIZ TANLAYMIZ (provider bermaydi, ≤20 belgi rasmiy
  chegara): Outbox `reference` bo'lsa SHA-256 hash orqali deterministik
  qisqartiriladi (retry'da BIR XIL id — idempotency), OTP uchun tasodifiy
  (bir martalik, stability shart emas).
- **Matn** — `SmsProvider` interfeysi ikkita chaqiruvchini (OTP: `template=
  otp_login`+`{code}`; Outbox: `template=eventType`+`{message}` —
  ALLAQACHON tayyor matn) BIR XIL usulda qabul qiladi;
  `renderPlayMobileText()` ikkalasini bitta matn qatoriga aylantiradi —
  PlayMobile'ning o'z "template-id" tizimi (portal ro'yxatdan o'tish talab
  qiladi) ISHLATILMAYDI.
- **Xato tasnifi** — rasmiy "Таблица 2.2" to'liq xaritalangan
  (`playmobile.types.ts`): deyarli barcha kod PERMANENT (bizning so'rov
  xatosi), FAQAT `100` (Internal server error) RETRYABLE. HTTP 401/403 —
  PERMANENT (auth/config). HTTP 429 — `Retry-After` o'qiladi. Tarmoq xatosi/
  timeout (10s, ICHKI qayta urinishsiz — bo'lim 8) — RETRYABLE (sukut).
- **Fail-closed** — `SMS_PROVIDER=CONSOLE` production'da IMKONSIZ
  (o'zgarishsiz, Bosqich 10). `SMS_PROVIDER=PLAYMOBILE` tanlansa
  `PLAYMOBILE_API_URL`/`LOGIN`/`PASSWORD`/`SENDER` HAMMASI majburiy (Zod
  superRefine + `sms.module.ts` ikkinchi qatlam).
- **OTP/Outbox semantikasi o'zgarmadi** — `OtpSmsProcessor` (BullMQ, alohida
  navbat, sir DB'ga yozilmaydi) va `OutboxWorkerService` (Phase 10, claim/
  deliver/finalize) provayder klassi haqida HECH NARSA bilmaydi
  (`SmsProvider` interfeysi buzilmagan).

### Real Payout — hali rasmiy tanlanmagan → `PAYOUTS_ENABLED=false`

Repository/business talab hali KONKRET payout rail (bank o'tkazmasi/karta
payout/merchant API) tanlamagan — bo'lim 13/14 bo'yicha arbitrary provider
O'YLAB TOPILMADI. Buning o'rniga **xavfsiz feature-gate**:

- `PAYOUTS_ENABLED` env (sukut `true` — dev/test, mavjud xatti-harakat
  o'zgarishsiz). `false` bo'lsa `payout.module.ts` `PAYOUT_PROVIDER`/
  `NODE_ENV`dan QAT'I NAZAR har doim `DisabledPayoutProvider` ishlatadi —
  bu "soxta TEST fallback" EMAS, alohida nomlangan, ochiq holat.
- `SellerPayoutController.create()` `PAYOUTS_ENABLED`ni ENG BIRINCHI
  tekshiradi — `FEATURE_DISABLED` (503) darhol, `PayoutService.create()`
  UMUMAN chaqirilmaydi (hech qanday rezervatsiya/DB yozuv urinilmaydi,
  mavjud hisob-kitob to'liq tegilmagan).
- `ReconciliationService`ning `queryPayout?` optional-capability
  tekshiruvi allaqachon mavjud (Bosqich 9) — `DisabledPayoutProvider` buni
  implement qilmaydi, reconciliation gracefully o'tkazib yuboradi.
- **Production launch payout'siz mumkin**: `PAYOUTS_ENABLED=false` +
  boshqa hamma narsa to'g'ri bo'lsa boot MUVAFFAQIYATLI (pastdagi fresh-DB
  dry-run bilan tasdiqlangan). Real rail tanlangach — `PayoutProvider`
  interfeysiga (§16-21, o'zgarishsiz) yangi provider qo'shiladi va
  `PAYOUTS_ENABLED=true`ga qaytariladi.

### Fresh migration chain — TASDIQLANGAN

Genuinely BO'SH (hech qachon migratsiya qilinmagan) Postgres DB'da
Phase 1 → Phase 12 barcha 19 ta migratsiya ketma-ket, xatosiz qo'llandi
(`prisma migrate deploy`, alohida rollar bilan). Faqat doimiy dev DB
(vaqt o'tishi bilan noaniq holatga kelishi mumkin) migratsiyalangan
bo'lishi YETARLI EMAS edi — bu talab endi mustaqil tasdiqlangan.

### Fresh production dry-run — TASDIQLANGAN

Yuqoridagi bo'sh DB'ga to'liq TO'G'RI production-simulyatsiya config bilan
(`NODE_ENV=production`, real Payme/PlayMobile placeholder credential,
`PAYOUTS_ENABLED=false`, `SWAGGER_ENABLED=false`, aniq `CORS_ORIGINS`,
`TRUST_PROXY=true`) boot qilindi:

```text
npm run production:check → PRODUCTION_CHECK_OK (barcha 10 tekshiruv PASS)
financial:check bo'sh DB'da → 0 CRITICAL (kutilganidek)
```

Bu — **konfiguratsiya/boot/integrity qatlamining** dalili. Haqiqiy Payme/
PlayMobile credential bilan REAL tarmoq chaqiruvi bu sessiyada QILINMADI
(pastga qarang — sandbox/live verification alohida, hamon `NOT_RUN`).

### Restore drill — TASDIQLANGAN

`pg_dump` (custom format, persistent dev DB) → yangi izolyatsiyalangan DB'ga
`pg_restore` → tekshiruv:

```text
1. Kritik jadval qatorlar soni (audit_logs, users, contracts, ...) — 1:1 mos
2. `prisma migrate status` — "up to date"
3. `boot-check.ts` — BOOT_OK (F1 DB rol assertion restored nusxada HAM o'tadi)
4. `financial:check` — manba bilan BIR XIL natija (mavjud 2 ta tarixiy
   CRITICAL anomaliya to'g'ri REPRODUCE bo'ldi — restore jarayoni ma'lumotni
   BUZMAGANINI isbotlaydi, muammoni yashirmaydi)
```

**Muhim eslatma**: `pg_restore` `--no-owner` bilan ishlatilganda
`_prisma_migrations`/append-only jadval huquqlari (`bobododa_migrator`
egaligi) YO'QOLADI — F1 keyin rad etadi. To'g'ri drill — `--no-owner`SIZ
(rollar cluster'da allaqachon mavjud bo'lishi kerak) YOKI restore'dan
keyin `roles.sql`ga teng GRANT/REVOKE qayta qo'llash. Real cloud-provider
avtomatik backup/restore (RDS/Cloud SQL snapshot) odatda buni to'g'ri
saqlaydi — bu topilma faqat qo'lda `pg_dump`/`pg_restore` oqimiga tegishli.

`RESTORE_DRILL = PASS` (sabab: yuqoridagi 4 qadam muvaffaqiyatli, throwaway
DB'larda, production data'ga tegmasdan).

### Outbox cutover dry-run

`npm run outbox:cutover -- --dry-run` — mavjud, ishlaydi (Bosqich 10'dan
beri), real yozuv/yuborish QILMAYDI, faqat ta'sirlanadigan qator sonini
chop etadi. Dev DB'da: 0 ta PENDING qator (worker doim tozalab turgan).

### Redis outage — arxitektura tasdiqlangan (kod o'zgarmadi)

Moliyaviy mutatsiyalar (Payment/Refund/Payout/Ledger) DB tranzaksiyasi
ICHIDA, Redis'ga BOG'LIQ EMAS — Redis o'chsa financial state buzilmaydi.
Redis'ga bog'liq oqimlar (OTP navbati, `RateLimiterService`, Outbox
BullMQ scheduling) Redis o'chganda ANIQ xato bilan muvaffaqiyatsiz bo'ladi
(`RateLimiterService.hit()` try/catch qilmaydi — ataylab, "fail open"
emas: rate-limit tekshirilmasdan o'tkazib yuborish xavfsizlik regressiyasi
bo'lardi). Outbox PENDING qatorlari Postgres'da xavfsiz qoladi — Redis
tiklangach worker davom etadi, hech narsa yo'qolmaydi.

### Staff production bootstrap

Kamida BITTA `ACTIVE` `SUPER_ADMIN` bo'lishi SHART — avtomatik
yaratilmaydi (default admin/parol — xavfsizlik xatosi bo'lardi). Birinchi
SUPER_ADMIN qo'lda, DB orqali (bir martalik, deploy runbook qadami)
yaratiladi: `staffAuthService`ning `create()` yo'li ORQALI EMAS (u HAM
SUPER_ADMIN talab qiladi — "tuxum-tovuq") — operator to'g'ridan-to'g'ri
`INSERT INTO staff_members (...)` bilan, `mustChangePassword=true` va
argon2id hash bilan. TOTP MAJBURIY EMAS (operatsion qaror — kuchli tavsiya
etiladi, ADR-05 qarang), lekin `mustChangePassword` hard gate (Bosqich 12)
birinchi login'da darhol parolni almashtirishga majburlaydi.

### Sandbox/live verification — HOZIRGACHA NOT_RUN

Real Payme/PlayMobile merchant credential bu muhitda mavjud emas — haqiqiy
tashqi tarmoq chaqiruvi QILINMADI. Kod darajasidagi tasdiqlash (protokol
kontrakti, 26+20 test) SANDBOX VERIFICATION'ning O'RNINI BOSMAYDI.
Real credential paydo bo'lganda: RUNBOOK §12 "Provider cutover checklist"
+ shu bo'limni real natija bilan yangilang.

---

## 14. Frontend production integratsiyasi (Bosqich 17)

Frontend (`/lib/api`) mock'dan real backend'ga o'tkazildi. Almashadigan
YAGONA fayllar — `lib/api/client.ts` (xaridor/mutaxassis) va
`lib/api/admin.ts` (xodim/admin) — CLAUDE.md'dagi migratsiya rejasiga mos.

### To'liq stack'ni birga ko'tarish (lokal)

```bash
# Terminal 1 — backend (Prisma Query Engine uchun nix-shell SHART,
# aks holda "could not locate the Query Engine for runtime linux-nixos")
cd backend && nix-shell --run "npm run start:dev"
#  → http://localhost:4000/health/ready

# Terminal 2 — frontend. NEXT_PUBLIC_API_URL `next dev` ISHGA TUSHISH
# VAQTIDA o'qiladi (hot-reload qilinmaydi) — server ishga tushmasdan OLDIN
# .env.local (gitignored, .env.example ga qarang) yozilgan bo'lsin:
#   NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
cd /home/laziz/Bobo-Doda && npm run dev
#  → http://localhost:3000
```

`SMS_PROVIDER` sukut qiymati `CONSOLE` — OTP kod backend stdout'iga
`📱 [SMS DEV — otp_login] → <phone> { code: '<code>' }` shaklida chiqadi;
`PAYMENT_PROVIDER` sukuti `TEST` — checkout javobida `checkoutUrl` KELMAYDI
(`TestPaymentProvider.createPayment()` uni bermaydi), shuning uchun
xaridor workroom sahifasi bu holatda pollingga o'tadi (`paymentsService.
getContractPayment()`, 5s × 24 urinish) — bu haqiqiy, kerakli mantiq,
o'lik defensive kod emas.

### Headless brauzer (Playwright) — NixOS sandbox resepti

Bu muhitda oddiy `npx playwright test` ISHLAMAYDI: Chromium'ga kerakli
FHS kutubxonalar (`libglib`, `libnspr4`, ...) tizimda standart yo'llarda
yo'q. Ishlaydigan retsept — `nix-shell` (kutubxonalar uchun) `steam-run`ni
(FHS moslashtirgich, allaqachon o'rnatilgan) o'rab oladi, HAMDA `TMPDIR`ni
aniq `/tmp` ga qaytaradi (`steam-run` `/tmp`ni alohida, deyarli bo'sh
mount namespace'ga izolyatsiya qiladi — tashqi nix-shell'ning o'z vaqtinchalik
`TMPDIR`i shu ichkarida mavjud bo'lmaydi va brauzer `mkdtemp ENOENT` bilan
yiqiladi):

```bash
nix-shell -p nspr nss glib gtk3 pango cairo atk cups dbus expat libdrm \
  libxkbcommon mesa udev alsa-lib at-spi2-atk at-spi2-core libxml2 libx11 \
  libxcomposite libxdamage libxext libxfixes libxrandr --run '
LDLP="$(nix-build "<nixpkgs>" -A nspr --no-out-link)/lib:$(nix-build "<nixpkgs>" -A nss --no-out-link)/lib:$LD_LIBRARY_PATH"
steam-run env LD_LIBRARY_PATH="$LDLP" TMPDIR=/tmp node scratch/smoke-test.mjs
'
```

Qo'shimcha eslatmalar:
- Test skripti **loyiha ildizi ostida** turishi kerak (masalan `scratch/`),
  `/tmp` ichida EMAS — Node ESM `node_modules`ni skript joylashuvidan
  yuqoriga qarab qidiradi, `NODE_PATH` ESM uchun ishlamaydi.
  `npx playwright install chromium` bir martalik (~300MB, fallback build —
  "OS rasmiy qo'llab-quvvatlanmaydi" ogohlantirishi normal).
- `steam-run` ostidan ishlayotgan skript host'ning vaqtinchalik sessiya
  papkalarini (masalan CI/agent scratch yo'llari) KO'RMAYDI — faqat
  `/home/...` ostidagi yo'llar ko'rinadi. Log tailing/screenshot chiqishi
  shunga qarab `/home/...` ostiga yo'naltirilsin.
- Backend CORS (`CORS_ORIGINS`) origin'ni ANIQ solishtiradi — test skripti
  `127.0.0.1` bilan `localhost`ni ARALASHTIRMASIN (ikkalasi brauzerda har
  xil origin, biri backend ro'yxatida bo'lmasa so'rov jim yiqiladi, hech
  qanday log backend'ga tushmaydi).

### Formal Playwright E2E suite — `npm run test:e2e:live`

`tests/e2e/` (root `playwright.config.ts`) — real backendga qarshi ishlaydigan
rasmiy suite, `scratch/smoke-*.mjs`larning o'rnini bosadi (ular bir martalik
qo'lda diagnostika skriptlari edi, repo deliverable'i emas). Ishga tushirish
xuddi yuqoridagi nix-shell+steam-run retsepti bilan:

```bash
nix-shell -p nspr nss glib gtk3 pango cairo atk cups dbus expat libdrm \
  libxkbcommon mesa udev alsa-lib at-spi2-atk at-spi2-core libxml2 libx11 \
  libxcomposite libxdamage libxext libxfixes libxrandr --run '
LDLP="$(nix-build "<nixpkgs>" -A nspr --no-out-link)/lib:$(nix-build "<nixpkgs>" -A nss --no-out-link)/lib:$LD_LIBRARY_PATH"
steam-run env LD_LIBRARY_PATH="$LDLP" TMPDIR=/tmp npx playwright test
'
```

**Muhim dizayn qarori — OTP IP-soatlik chegarasi (20/soat, BARCHA telefon
raqamlari birgalikda, `backend/src/modules/auth/constants/otp.constants.ts`,
env orqali sozlanmaydi).** Bu sessiyada tirik brauzer testlari aynan shu
chegaraga urilib to'xtab qoldi — shuning uchun suite HAR bir test uchun
alohida OTP so'ramaydi. **Boshlang'ich dizayn** (`globalSetup` + bir marta
login qilib natijani `storageState` JSON faylga yozib, ko'p fayl/kontekst
orasida qayta ishlatish) birinchi tirik ishga tushirishda XATO chiqdi —
refresh token BIR MARTALIK (rotatsiya + qayta-ishlatishni aniqlash, to'g'ri
xavfsizlik xatti-harakati): statik JSON'dagi "muzlatilgan" cookie'ni
ikkinchi mustaqil kontekst yuklasa, birinchisi allaqachon uni aylantirib
bo'lgan bo'ladi va ikkinchisi `TOKEN_REUSED` (401) bilan yiqiladi. **Yakuniy
(ishlaydigan) dizayn**: `global-setup.ts` UMUMAN YO'Q — har bir spec fayl
`test.beforeAll`da O'ZINING BITTA jonli kontekst/sahifasini ochadi
(`tests/e2e/helpers.ts` — `loginBuyer()`/`setupApprovedSeller()`, ikkalasi
ham YANGI tasodifiy raqam bilan) va shu BITTA (fayl emas, jonli) sahifani
butun fayl davomida qayta ishlatadi (`test.describe.serial()` bilan bir
nechta test bitta sahifani baham ko'radi); ikki aktyor kerak bo'lgan
fayllar (purchase-lifecycle, disputes) ikkalasini ham o'z `beforeAll`/test
tanasida ochadi. `playwright.config.ts`da `workers: 1` + `fullyParallel:
false` ataylab — parallellik shu chegarani osongina buzardi. To'liq suite
~7 ta OTP so'rov sarflaydi (soatiga ~2-3 marta ishga tushirish mumkin).
Sotuvchi tasdiqlash (`seller_applications.status='APPROVED'`) va uning
bitta faol xizmati xodim moderatsiyasi o'rniga to'g'ridan-to'g'ri DB orqali
(`runDbCommand`, `setupApprovedSeller()` ichida) o'rnatiladi — staff login
bu sessiyada sinovdan o'tkazilmagani sabab (pastga qarang).

`tests/e2e/admin.spec.ts` `E2E_STAFF_EMAIL`/`E2E_STAFF_PASSWORD` berilmasa
tushunarli sabab bilan `test.skip()` qilinadi (jimgina "yashil" chiqib,
qamrov yo'qligini yashirmaydi) — staff hisob parolini DB orqali o'rnatish
"secret-store write" sifatida avtomatik bloklandi (pastga qarang).

`tests/e2e/purchase-lifecycle.spec.ts` va `disputes.spec.ts` Bosqich 17'da
tirik brauzer orqali topilgan UCH real xatoni regressiyadan himoya qiladi
(barchasi shu sessiyada tuzatildi):
1. Xaridorning "To'lash" tugmasi HAR safar faol+mablag'lanmagan kontraktni
   ochganda ~2 daqiqaga yashiringan edi (`app/xaridor/shartnomalar/[id]/
   page.tsx` — polling effekti optimistik `"processing"` bilan boshlanardi).
2. Sotuvchi HECH QACHON "mablag'langan" holatini ko'rmasdi (`hydrateContract`/
   `mapContract`, `lib/api/client.ts`+`mappers.ts` — `funded=true` bo'lsa ham
   `fundedAt` doim `undefined` qolardi, sahifa `!!contract.fundedAt`ga
   tayanadi).
3. Nizo ochish HAR DOIM 422 (`IDEMPOTENCY_KEY_REQUIRED`) bilan muvaffaqiyatsiz
   bo'lardi — `disputesService.open()` backend MAJBURIY talab qiladigan
   `Idempotency-Key` header'ini yubormasdi. Audit paytida YANA IKKITASI
   topildi (xuddi shu naqsh): `staffResolveDispute`/`staffCreateRefund`
   (`lib/api/admin.ts`) — ikkalasi ham tuzatildi, `staffHttp()`ga
   `idempotencyKey` qo'llab-quvvatlash qo'shildi (`lib/api/staff-http.ts`).

### Bilinadigan benign xatti-harakat — birinchi `/me` so'rovida 401

Access token FAQAT xotirada saqlanadi (module-scope, XSS'dan himoya —
`lib/api/http.ts`); to'liq sahifa navigatsiyasidan keyin u yo'qoladi.
`bootstrapSession()` fonda `/auth/refresh`ni boshlaydi, lekin sahifa
komponenti undan OLDIN birinchi so'rovni yuborishi mumkin — natijada
tarmoq jurnalida bitta `401 GET /me` ko'rinadi, so'ng `http()`ning
single-flight refresh+retry mexanizmi uni JIMGINA tuzatadi (foydalanuvchi
hech narsa sezmaydi). Bu XATO EMAS — brauzer DevTools tarmoq bo'limida
ko'ringanda tekshiruv/QA jarayonida shuni hisobga oling.

### Gated (ataylab o'chirilgan) funksiyalar

Real backend'da ekvivalenti yo'q yoki hali qamrovga kiritilmagan mock
funksiyalar `client.ts`/`admin.ts` darajasida `FEATURE_DISABLED` xato bilan
o'raladi — har bir sahifaning mavjud `loadError`/`<ErrorState>` konvensiyasi
buni avtomatik ko'rsatadi (sahifa kodi o'zgarmaydi): Ish e'loni/Taklif/Offer
ikki yo'lli arxitekturasi, Xabarlar (chat), Sharhlar, bildirishnoma
lentasi, Saqlanganlar, KYC verifikatsiya, mock support ticketlar, bank
kartasi boshqaruvi, xaridor balansini kartaga yechish. Admin panelda —
foydalanuvchi aniq tanlovi bilan (`AskUserQuestion`, Bosqich 17) — faqat
Foydalanuvchilar/Nizolar/To'lovlar+Qaytarish/Shartnomalar/Audit jurnali
real; Xizmatlar/Kategoriyalar/Pul chiqarish mutatsiyalari/Xodimlar
boshqaruvi/Reconciliation/Outbox hozircha gated holatda qoladi.

---

## 18. Admin E2E — izolyatsiyalangan test muhiti (Bosqich 18)

Admin panelining real browser E2E'si dev/prod Postgres+Redis'ga UMUMAN
TEGMAYDI — o'zining butunlay alohida, throwaway stack'iga ega:

| Komponent | Dev/prod | Isolated E2E |
|---|---|---|
| Postgres | `:5432` | `:55433` (`scratch/e2e-infra/pgdata`) |
| Redis | `:6379` | `:6390` (`scratch/e2e-infra/redis-data`) |
| Backend | `:4000` | `:4010` (`backend/.env.e2e`, `NODE_ENV=test`) |
| Frontend | `:3000` | `:3010` (`NEXT_PUBLIC_API_URL=...4010/api/v1`) |

### Ishga tushirish

```bash
# 1) Infra + backend + frontend — bir buyruq, idempotent (allaqachon
#    ishlab turgan qismlarni qayta ko'tarmaydi)
nix-shell backend/shell.nix --run 'bash backend/scripts/e2e-stack-up.sh'

# 2) Test-only staff hisoblari — REAL argon2id hash kodi orqali
#    (backend/scripts/e2e-staff-fixture.cjs, dist/common/security/
#    hash.service.js'ni require qiladi — soxta/shortcut hash EMAS).
#    Idempotent (email bo'yicha upsert) — mustChangePassword testidan
#    keyin parolni asl holatiga qaytarish uchun QAYTA ishga tushiring.
nix-shell backend/shell.nix --run '
  DATABASE_URL="postgresql://bobododa_app:app@127.0.0.1:55433/bobododa_e2e?schema=public" \
  node backend/scripts/e2e-staff-fixture.cjs
'

# 3) Admin E2E'ni ishga tushirish (xuddi §14dagi nix-shell+steam-run
#    retsepti bilan)
nix-shell -p nspr nss glib gtk3 pango cairo atk cups dbus expat libdrm \
  libxkbcommon mesa udev alsa-lib at-spi2-atk at-spi2-core libxml2 libx11 \
  libxcomposite libxdamage libxext libxfixes libxrandr --run '
LDLP="$(nix-build "<nixpkgs>" -A nspr --no-out-link)/lib:$(nix-build "<nixpkgs>" -A nss --no-out-link)/lib:$LD_LIBRARY_PATH"
steam-run env LD_LIBRARY_PATH="$LDLP" TMPDIR=/tmp npx playwright test admin.spec.ts
'

# To'xtatish (ma'lumot saqlanadi — tezroq qayta ishga tushirish uchun):
bash backend/scripts/e2e-stack-down.sh
# Butunlay tozalash (Postgres/Redis data dir o'chiriladi):
bash backend/scripts/e2e-stack-down.sh --purge
```

### Test-only staff hisoblari (`backend/scripts/e2e-staff-fixture.cjs`)

| Email | Rol | Huquq | mustChangePassword | Vazifasi |
|---|---|---|---|---|
| `super@e2e.test` | SUPER_ADMIN | barcha 16 ta | `false` | asosiy oqim, kritik ekranlar, refund/resolve |
| `reset@e2e.test` | SUPER_ADMIN | barcha 16 ta | `true` | hard-gate stsenariysi (bo'lim 5) |
| `restricted@e2e.test` | ADMIN | faqat `DASHBOARD` | `false` | ruxsat/403 stsenariysi (bo'lim 7) — ATAYLAB rol emas, HUQUQ orqali cheklangan, chunki `/admin/kirish`ning `expectedRole="admin"` tekshiruvidan o'tishi kerak (SUPER_ADMIN/`role="super_admin"` bo'lsa avtomatik FORBIDDEN bo'lardi — `AdminLoginForm`) |

Parol — barchasida bir xil, `E2E_STAFF_PASSWORD` env (sukut
`E2eTest#2026Pass`). **Hech qanday real secret emas** — bu login FAQAT
`bobododa_e2e` bazasida ishlaydi (skript `DATABASE_URL`da "bobododa_e2e"
so'zi yo'q bo'lsa ATAYLAB RAD ETADI — dev/prod bazasiga tasodifan yozib
yuborish ehtimolidan himoya).

### Test ma'lumotlari (`tests/e2e/admin-helpers.ts` — `seedAdminTestData()`)

Har `admin.spec.ts` ishga tushishida REAL API orqali (brauzersiz, tez):
xaridor+sotuvchi (OTP, isolated backend'ning O'Z rate-limit budjeti bilan
— pastga qarang), 1 xizmat, 1 shartnoma (qabul qilingan + TEST webhook
bilan to'langan), 1 OCHIQ nizo. Bular admin Foydalanuvchilar/Shartnomalar/
To'lovlar/Nizolar sahifalarida HAQIQIY qator sifatida ko'rinadi (bo'sh
ro'yxatni "ishlayapti" deb hisoblash xato bo'lardi).

**DIQQAT — OTP budjeti bu yerda HAM amal qiladi** (§14dagi bilan bir xil
mexanizm, lekin ALOHIDA IP-hisoblagich, chunki alohida Redis): bitta
`seedAdminTestData()` chaqiruvi 2 ta OTP so'rov sarflaydi. Ushbu
sessiyada izolyatsiyalangan muhitning o'zi ham to'liq 20/soat chegarasiga
urilib to'xtadi (ko'p marta qo'lda qayta ishga tushirish debug jarayonida)
— production/CI'da bitta oddiy ishga tushirish (soatiga 1 marta) bu bilan
hech qachon to'qnashmaydi.

### Nima uchun bunday (izolyatsiya qarori)

Bosqich 17'da staff login sinovi shu SABABDAN bloklangan edi: yagona
mavjud staff hisobi (`ops-phase4@bobododa.uz`, dev bazasida) parolini
bilmasdim, va YANGI parol/hash yaratish (hatto yangi test hisob uchun ham)
"secret-store write" sifatida avtomatik bloklandi. Bosqich 18'da bu
TO'G'RI hal qilindi — dev/prod parolini reset qilish yoki bypass qilish
O'RNIGA, butunlay ALOHIDA bazada, REAL production hashing kodi bilan,
faqat shu bazaga yozadigan qattiq tekshiruv bilan test hisob yaratildi.
Fake JWT/localStorage/TOTP bypass ISHLATILMAGAN — barcha login
`/staff/auth/login` real endpoint orqali.

### Yakuniy natija — 13 test (1 hujjatlashtirilgan skip), 0 muvaffaqiyatsiz

To'liq izolyatsiyalangan muhitda YAKUNIY, toza ishga tushirish: **12 PASS,
1 SKIP (TOTP — UI yo'q, pastga qarang), 0 FAIL**. Qamrov: dashboard,
foydalanuvchilar (real sotuvchi qatori bilan), shartnomalar, to'lovlar
(real SUCCEEDED to'lov), nizolar (real OCHIQ nizo), audit, xizmatlar
(gated — graceful ErrorState), moliyaviy xavfsizlik (xavfli tugma yo'q),
refund/nizo-hal-qilish Idempotency-Key, `mustChangePassword` hard gate,
ruxsat/403 (frontend + mustaqil backend tekshiruvi). To'liq suite
(`npx playwright test`, admin+xaridor+mutaxassis birga) — **23 PASS,
1 SKIP, 0 FAIL, 24 jami**.

Ishga tushirishlar orasida **fixture'larni qayta o'rnatish shart**
(idempotent, lekin transaktsion ma'lumot yig'ilib boradi):
```bash
psql -h 127.0.0.1 -p 55433 -U bobododa -d bobododa_e2e -c \
  "TRUNCATE TABLE disputes, payments, refunds, milestones, contracts, services, seller_applications CASCADE;"
nix-shell backend/shell.nix --run '
  DATABASE_URL="postgresql://bobododa_app:app@127.0.0.1:55433/bobododa_e2e?schema=public" \
  node backend/scripts/e2e-staff-fixture.cjs
'
```
(`TRUNCATE` — superuser `bobododa` bilan, `bobododa_app`da bu huquq YO'Q,
append-only dizayn qasddan; `e2e-staff-fixture.cjs` — `mustChangePassword`
testi `reset@e2e.test` parolini o'zgartirgani sabab, har safar qayta
kerak.)

### Playwright faylida `test.skip()` doiraси — haqiqiy xato, TUZATILDI

Bosqich 18 yakuniy tekshiruvida: `test.skip(condition, reason)` FAYL
DARAJASIDA (`test()` chaqiruvi TASHQARISIDA) chaqirilsa, Playwright BUTUN
FAYLDAGI barcha keyingi testlarni skip qiladi — faqat maqsadli bitta
testni emas. Bu `admin.spec.ts`da barcha 13 testni (TOTP ham, boshqa
12 tasi ham) skip qilib yuborgan edi. To'g'ri naqsh: `test.skip()` FAQAT
`test("...", async () => { test.skip(true, "sabab"); ... })` — test()
callback'i ICHIDA chaqirilsin.

### Muhim metodologik dars — `npm run test:e2e` (Jest, backend) va Redis kontensiyasi

Backend'ning O'ZINING Jest e2e suite'i (`test/*.e2e-spec.ts`, Docker/
Testcontainers EMAS — lokal `E2E_SUPERUSER_URL`/`E2E_REDIS_URL` orqali
haqiqiy Postgres/Redis'ga ulanadi, standart qiymat mos kelmasa
`postgresql://postgres:postgres@127.0.0.1:5432/postgres` — bu loyihada
haqiqiy superuser `bobododa` (trust auth), shuning uchun
`E2E_SUPERUSER_URL="postgresql://bobododa@127.0.0.1:5432/postgres"`
berish kerak) uzoq muddat ishlab turgan ODDIY dev backend (`npm run
start:dev`, `:4000`) bilan BIR XIL Redis'ga (`:6379`) ulanganda, ikkalasi
ham `otp-sms` BullMQ navbatiga (`src/infra/sms/otp-sms.processor.ts`)
obuna bo'ladi va JOB'LAR UCHUN RAQOBATLASHADI — Jest'ning o'z ichki
`CapturingSmsProvider`si ko'p hollarda kodni HECH QACHON olmaydi ("waitFor
timeout (otp sms)"). **Yechim: `npm run test:e2e`ni ishga tushirishdan
oldin `:4000`dagi dev backend'ni vaqtincha to'xtating** (yoki butunlay
alohida Redis'ga ulang). Bosqich 18'da bu aynan shu sababdan 197/308 test
yiqilgan (kontaminatsiyalangan, 1076s) va dev backend to'xtatilgach
308/308 PASS (toza, 149s) natija berdi — **ilova kodida hech qanday
regressiya yo'q edi**, sof test-muhit izolyatsiyasi masalasi.

## 19. OTP siyosati audit — SMS ONLY (Bosqich 19)

**Qoida (o'zgarmas): foydalanuvchiga yuboriladigan HAR QANDAY OTP kod
FAQAT SMS orqali yetkaziladi.** Email OTP yo'q, Telegram OTP yo'q, frontend
yoki backend'da kanal tanlash (`channel`) parametri yo'q. Bu bo'lim to'liq
repo auditining natijasi va uni qayta tekshirish uchun yo'l-yo'riq.

### Nima topildi va nima o'zgardi

- **Yopilgan production gap**: `backend/src/config/env.schema.ts`dagi
  `superRefine` fail-closed blokiga `SMS_PROVIDER === 'CONSOLE'` tekshiruvi
  qo'shildi — ilgari `SWAGGER_ENABLED`/`DB_ROLE_ASSERTION`/`PAYMENT_PROVIDER`
  uchun bor edi, `SMS_PROVIDER` uchun YO'Q edi. Demak, production oldin
  CONSOLE provider (faqat stdout'ga yozadi, hech kimga yetkazmaydi) bilan
  jimgina ko'tarilishi MUMKIN edi. Endi `SMS_PROVIDER=CONSOLE` bilan
  production `validateEnv()` xato tashlab boot bo'lmaydi — real PLAYMOBIL
  credential (`PLAYMOBILE_API_URL`/`LOGIN`/`PASSWORD`/`SENDER`) SHART.
- **Olib tashlangan o'lik/soxta kod** (mock-era, production'da ishlamagan):
  `app/xaridor/sozlamalar/page.tsx`dagi "Connected Accounts" bloki —
  Google/Telegram "ulash" tugmalari faqat local state'ni almashtirar,
  hech qanday haqiqiy backend chaqiruvi yo'q edi (soxta UI). Shu bilan
  birga `lib/types.ts`dan `googleConnected`/`telegramConnected`/
  `telegramUsername` maydonlari va `lib/mock-api/index.ts`dan 4 ta o'lik
  funksiya (`loginWithTelegram`/`loginWithGoogle`/`verifyTelegram`/
  `verifyGoogle`) o'chirildi — bular eski (Bosqich 17'gacha) mock
  arxitekturasidan qolgan, real backend'da HECH QACHON chaqirilmagan.
- **Tuzatilgan noto'g'ri kontent**: `lib/faq-content.ts` va
  `lib/help-articles.ts`dagi ro'yxatdan o'tish tavsifi avval "Telegram
  orqali tasdiqlash"ni oxirgi bosqich sifatida tasvirlar edi — bu HECH
  QACHON to'g'ri bo'lmagan (real oqim: telefon → SMS OTP → rol, parolsiz).
  Help-markaz maqolasi `"telegram-orqali-tasdiqlash"` → `"sms-orqali-
  tasdiqlash"` slug'iga ko'chirildi, matn to'g'rilandi (uz/ru/en).
- **UX matni aniqlashtirildi**: `auth.otpSentTo` ("Kod shu raqamga
  yuborildi:") → **"SMS kod shu raqamga yuborildi:"** (uz/ru/en) — OTP
  sahifasida SMS kanali endi ANIQ aytiladi, ilgari faqat `auth.otpIntro`
  (so'rash sahifasi) aytardi, tasdiqlash sahifasi aytmasdi.
- **Yangi testlar** (`backend/test/auth.e2e-spec.ts`): muddati tugagan kod
  rad etiladi (`expiresAt` o'tmishga surilib tekshiriladi), bir marta
  ishlatilgan kod ikkinchi marta rad etiladi (single-use CAS), va
  `/otp/request` `{"channel":"email"}` kabi whitelist'dan tashqari maydonni
  rad etadi (422 VALIDATION — global `ValidationPipe({whitelist:true,
  forbidNonWhitelisted:true})` tufayli, kanal selektori arxitektura
  darajasida IMKONSIZ). Yangi statik audit spec:
  `backend/src/modules/auth/otp-policy.audit.spec.ts` — `src/` ostidagi
  HAR BIR faylni email/Telegram-OTP kalit so'zlarga (`EmailOtpService`,
  `sendOtpEmail`, `sendOtpToTelegram`, `telegramVerification`,
  `EMAIL_OTP`, `TELEGRAM_OTP` va h.k.) qidiradi va `RequestOtpDto`
  manbasida `channel` so'zi yo'qligini tasdiqlaydi — kelajakda kimdir
  email/Telegram OTP yo'lini qayta qo'shsa, bu test qizil bo'ladi.

### Ataylab TEGILMAGAN (legitim, OTP'ga aloqasi yo'q)

- **Staff/admin TOTP** (authenticator-app 2FA, `staff-auth` moduli) —
  bu **BOSHQA xavfsizlik mexanizmi**, marketplace-foydalanuvchi SMS
  OTP'idan mustaqil. Email+parol+ixtiyoriy TOTP — SMS'ga aylantirilmaydi,
  aylantirilishi ham kerak emas (TOTP standart, provayderga bog'liq emas,
  SMS'dan XAVFSIZROQ). §11ga qarang.
- **Telegram support** (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_SUPPORT_CHAT_ID`,
  frontend `app/api/support/route.ts`) — sayt ichidagi Yordam modalining
  xabarlarini Telegram'ga uzatadi, OTP bilan HECH QANDAY aloqasi yo'q.
  Ikkala `.env.example` faylida ham endi aniq "bu OTP kanali emas" izohi
  bor.
- **Payme'ning o'z 3DS/OTP oqimi** — tashqi provayder javobgarligi,
  loyiha kodiga umuman kirmaydi, tegilmadi.
- Anti-circumvention ogohlantirish matni (shartnoma tuzilmagunча telefon/
  Telegram almashmaslik haqida, `ProposalChat.tsx` va h.k.) va
  `lib/chat-filter.ts` — bular aloqa ma'lumotini ANIQLASH xavfsizlik
  xususiyati, OTP yetkazish emas.

### Qayta tekshirish uchun

```bash
# Backend: SMS_PROVIDER=CONSOLE production'da rad etiladi
cd backend && nix-shell --run "npx jest src/config/env.schema.spec.ts"
# Statik audit — email/Telegram OTP kod yo'li yo'q
cd backend && nix-shell --run "npx jest src/modules/auth/otp-policy.audit.spec.ts"
# To'liq OTP xavfsizlik xossalari (expiry/single-use/attempt-limit/
# cooldown/IP-limit/channel-whitelist) — E2E_SUPERUSER_URL §18/19dagidek
cd backend && nix-shell --run 'E2E_SUPERUSER_URL="postgresql://bobododa@127.0.0.1:5432/postgres" npm run test:e2e'
```

## 20. Login va Registration ajratilishi (Bosqich 20)

**O'zgarish**: avvalgi combined oqim (`/kirish` — telefon → SMS OTP →
verify → mavjud bo'lmasa AVTO-CREATE) olib tashlandi. Endi **LOGIN va
REGISTER ikkita alohida sahifa/niyat**:

```text
LOGIN    = FAQAT mavjud User'ni autentifikatsiya qiladi. HECH QACHON
           yangi User yaratmaydi.
REGISTER = User yaratishning YAGONA yo'li. HECH QACHON mavjud hisobga
           ustidan yozmaydi.
Ikkalasi ham = SMS OTP orqali (parol yo'q, email/Telegram OTP yo'q —
           §19dagi SMS-ONLY siyosat o'zgarmadi).
```

### Arxitektura qarorlari

- **API — bitta endpoint juftligi, `intent` maydoni bilan** (yangi endpoint
  juftligi EMAS): `POST /auth/otp/request` va `POST /auth/otp/verify`
  ikkalasi ham endi majburiy `intent: "LOGIN" | "REGISTER"` (Prisma
  `AuthIntent` enum) qabul qiladi. Bu **kanal EMAS** (§19dagi "channel"
  taqiqi bilan chalkashtirilmasin) — OTP yetkazilishi baribir 100% SMS,
  `intent` faqat "bu challenge qaysi oqim uchun" ma'nosini bildiradi.
  Sabab: alohida `/auth/login/*`/`/auth/register/*` endpoint juftligi
  OTP mexanikasining (rate-limit/hash/single-use) 95%ini ikki marta
  takrorlagan bo'lardi — overengineering.
- **`OtpCode.intent` — yangi ustun** (`AuthIntent` enum, migration
  `20260915120000_stage20_auth_intent`). `OtpService.verifyOtp`ning
  `WHERE`i endi `{phone, intent, consumedAt: null, expiresAt: {gt: now}}`
  — LOGIN uchun so'ralgan challenge REGISTER verify'da **UMUMAN
  topilmaydi** (INVALID_CODE, xuddi mavjud bo'lmagandek), va aksincha.
- **Cooldown — `phone+intent` bo'yicha ajratilgan**, kunlik/IP chegara
  esa **umumiy** (faqat `phone`/`ip`): "hisob topilmadi → Ro'yxatdan
  o'tish" CTA'sidan keyin foydalanuvchi 60s kutmasdan REGISTER kodini
  olishi kerak (UX), lekin kunlik/soatlik hajm chegarasi LOGIN/REGISTER
  almashtirib IKKI BARAVAR oshirilmasin (xavfsizlik — `otp.service.ts`
  izohi).
- **`AuthService.login`/`register`** — avvalgi yagona
  `verifyOtpAndLogin` ikkiga bo'lindi:
  - `login()`: `User` topilmasa `NotFoundError('...', 'USER_NOT_FOUND')`
    — **mavjud** xato kodi (`ERROR_CODES.USER_NOT_FOUND`, 404),
    duplikat taksonomiya YARATILMADI (§21 talabi).
  - `register()`: `prisma.user.create()` to'g'ridan-to'g'ri chaqiriladi
    (avval `findUnique`+`create` EMAS) — DB `User.phone @unique`
    cheklovi RACE-SAFE yagona haqiqat manbai. `Prisma.
    PrismaClientKnownRequestError` `P2002`ni ushlab `ConflictError('
    PHONE_EXISTS', ...)`ga tarjima qiladi (loyihada allaqachon 8+ joyda
    ishlatiladigan naqsh — `category.service.ts` va h.k.). Boshqa
    Prisma xatosi QAYTA TASHLANADI (yutilmaydi).
- **Enumeration xavfsizligi saqlanadi**: `USER_NOT_FOUND`/`PHONE_EXISTS`
  faqat **VALID OTP tasdiqlangandan KEYIN** (`verify` bosqichida)
  oshkor bo'ladi — `request` bosqichi hamon har doim generic
  `{sent:true}` qaytaradi (telefon mavjud/mavjud emasligidan qat'iy
  nazar).

### Yangi frontend routes

```text
/kirish                    — LOGIN: telefon → SMS OTP → mavjud hisobga
/kirish/tasdiqlash         — LOGIN OTP verify; USER_NOT_FOUND → "Hisob
                              topilmadi. Ro'yxatdan o'tishni xohlaysiz-
                              mi?" CTA (/royxatdan-otish, prefill bilan)
/royxatdan-otish            — REGISTER: telefon → SMS OTP → yangi hisob
/royxatdan-otish/tasdiqlash — REGISTER OTP verify; PHONE_EXISTS →
                              "Hisob allaqachon mavjud. Kirishni
                              xohlaysizmi?" CTA (/kirish, prefill bilan)
```

Muvaffaqiyatli REGISTER → `/rol-tanlash` (rol tanlash FAQAT bu yerda —
mavjud foydalanuvchi LOGIN qilganda hech qachon qayta so'ralmaydi,
chunki uning `roleChosen`/`lastActiveRole`i allaqachon bor). Muvaffaqiyatli
LOGIN → to'g'ridan-to'g'ri kabinet (yoki onboarding davom etadi, sessiya
holatidan aniqlanadi — o'zgarmagan mantiq).

`sessionStorage` — ikkala oqim MUSTAQIL kalit ishlatadi
(`bd_login_otp_phone` / `bd_register_otp_phone`), intent chalkashib
ketmasin deb ATAYLAB (§18/19 talabi — sensitive OTP context xavfsiz
saqlanishi). "Hisob topilmadi"/"allaqachon mavjud" CTA'lari
`bd_prefill_phone` orqali telefonni ikkinchi sahifaga oldindan
to'ldiradi (kichik UX yaxshilanishi — majburiy emas edi, lekin CTA'ning
o'zi past-friction pivotni nazarda tutadi).

Redirect xavfsizligi: hech qaysi sahifa query-param orqali arbitrary
`redirect=`ni qabul qilmaydi — muvaffaqiyatli login/register'dan keyingi
yo'naltirish har doim FIXED, ichki marshrutlar (`/xaridor`, `/mutaxassis`,
`/mutaxassis/royxat`, `/rol-tanlash`) orasidan sessiya holatiga qarab
hisoblanadi — open redirect yuzasi yo'q.

### Testlar

- **Backend unit** (`auth.service.spec.ts`, fake Prisma/OtpService):
  LOGIN mavjud/mavjud-emas, LOGIN hech qachon `create` chaqirmaydi,
  REGISTER yangi/mavjud (P2002→PHONE_EXISTS), P2002-dan-boshqa xato
  qayta tashlanadi, yaroqsiz OTP User yaratmaydi.
- **Backend e2e** (`test/auth.e2e-spec.ts`, real Postgres+Redis, 37 test):
  yuqoridagilar + intent-binding (LOGIN OTP REGISTER'da ishlamaydi va
  aksincha) + **10 ta parallel verify (bir xil kod) → FAQAT bitta User**
  (real DB unique constraint ostida) + cooldown intent-ajratilgan +
  kunlik chegara intent-umumiy (bypass qilib bo'lmaydi) + eski
  regressiyalar (refresh rotatsiya/reuse, rol tanlash, sessiya egaligi).
- **Frontend Playwright** (`tests/e2e/auth.spec.ts`, 6 test): to'liq
  REGISTER oqimi (noto'g'ri kod → to'g'ri kod → rol tanlash →
  dashboard), to'liq LOGIN oqimi, "hisob topilmadi" CTA + prefill,
  "hisob allaqachon mavjud" CTA + prefill, ikkala sahifada email/
  Telegram/Google variant yo'qligi (§19 regressiya tekshiruvi).
  `tests/e2e/helpers.ts#registerViaUi`/`loginViaUi` — avvalgi
  `otpLogin()` (har doim yangi telefon bilan chaqirilardi, ya'ni aslida
  REGISTER semantikasi) ikkiga aniq bo'lindi;
  `tests/e2e/admin-helpers.ts#otpLoginToken` ham `intent: "REGISTER"`
  bilan yangilandi (u ham har doim `freshPhone()` bilan chaqiriladi).

### Migratsiya (dev DB ownership anomaliyasi)

`otp_codes`/`sms_logs` jadvallari lokal dev DB'da (aniqlanmagan tarixiy
sabab bilan) `bobododa_migrator` o'rniga superuser `bobododa`ga tegishli
edi (boshqa BARCHA jadval to'g'ri `bobododa_migrator`da) — bu Bosqich
20 migratsiyasini `bobododa_migrator` bilan (standart `prisma migrate
deploy` yo'li) qo'llashni bloklagan (`must be owner of table
otp_codes`). Tuzatildi: `ALTER TABLE otp_codes OWNER TO
bobododa_migrator;` (superuser bilan, bir martalik). Bu FAQAT lokal dev
anomaliyasi edi — yangi/boshqa muhitlarda takrorlanmasligi kerak
(`roles.sql` barcha jadvalni to'g'ri rolga yaratadi).

## 21. Parol bilan login (Bosqich 21)

**Asosiy maqsad**: SMS xarajatini kamaytirish. **SMS telefon egaligini
isbotlash uchun, HAR BIR login uchun EMAS.**

```text
REGISTRATION = 1 SMS  (telefon → OTP → parol → User)
LOGIN         = 0 SMS  (telefon + parol → sessiya)
FORGOT PASS   = 1 SMS  (telefon → OTP → yangi parol)
```

Bosqich 20'dagi combined "LOGIN OTP" arxitekturasi BUTUNLAY olib
tashlandi — endi login OTP bilan UMUMAN ishlamaydi.

### Arxitektura

- **`OtpPurpose` enum** (`AuthIntent`ning o'rnini bosadi, migration
  `20260915150000_stage21_password_auth`): `REGISTER` | `PASSWORD_RESET`.
  `LOGIN` qiymati OLIB TASHLANDI — login endi OTP bilan aloqasi yo'q.
  `OtpCode.intent` ustuni `OtpCode.purpose`ga qayta nomlandi (semantik
  aniqlik uchun).
- **`AuthGrant` — yangi model** (bir xil jadval, ikkala maqsad uchun ham):
  OTP tasdiqlangandan KEYIN, yakuniy amal (User yaratish / parol
  almashtirish) bajarilgunga qadar berilgan qisqa umrli (10 daqiqa),
  bir martalik "grant". `RefreshToken`/`StaffSession` bilan BIR XIL
  naqsh — xom token DB'da saqlanmaydi (faqat SHA-256, `hashOpaqueToken`),
  `consumedAt` CAS bilan bir martalik iste'mol qilinadi. `PASSWORD_RESET`
  uchun `userId` bog'langan, `REGISTER` uchun `userId=null` (User hali yo'q).
- **Uchta yangi endpoint guruhi** (eski `/auth/otp/request`+`/verify`
  o'rniga, `intent`siz — endi marshrut o'zi maqsadni bildiradi):
  ```text
  POST /auth/register/request-otp   {phone}
  POST /auth/register/verify-otp    {phone, code} → {registrationToken}
  POST /auth/register/complete      {registrationToken, password, confirmPassword} → sessiya

  POST /auth/login                  {phone, password} → sessiya (SMS YO'Q)

  POST /auth/password-reset/request-otp  {phone}
  POST /auth/password-reset/verify-otp   {phone, code} → {resetToken}
  POST /auth/password-reset/complete     {resetToken, password, confirmPassword} → {ok:true} (sessiya YO'Q)
  ```
- **`AuthService.login`** — `StaffAuthService.login`dagi AYNAN bir xil
  naqsh: IP+telefon rate-limit (parol tekshirishdan OLDIN), keyin
  `dummyHash` orqali timing-parity (telefon topilmasa HAM argon2id
  hisoblanadi — enumeration-safe), keyin `AccountStatusGuard`dagi bilan
  bir xil BLOCKED/SUSPENDED(lazy-expiry) tekshiruvi (guard faqat
  POST-auth marshrutlarda ishlaydi, login esa undan OLDIN — shuning
  uchun bu yerda QAYTA yozilgan, xuddi shu siyosat bilan).
- **SMS-tejash (`requestPasswordResetOtp`)**: `User`ni oldindan tekshiradi
  — mavjud bo'lsa `OtpService.requestOtp(..., skipDelivery:false)`,
  mavjud bo'lmasa `skipDelivery:true`. `OtpService` HAR IKKALA holatda
  ham TO'LIQ rate-limit (cooldown+kunlik+IP) qo'llaydi — faqat OTP qatori
  yaratish+SMS-navbat bosqichi o'tkazib yuboriladi. Bu MUHIM: agar
  rate-limit shartli bo'lganda, "cheklovga tegmayapti" holatining o'zi
  telefon mavjudligini oshkor qilardi (timing/behavior side-channel).
  Response HAR DOIM bir xil `{sent:true}`.
- **Xato taksonomiyasi — duplikat YARATILMADI**: `INVALID_CREDENTIALS`
  (login, mavjud), `ACCOUNT_BLOCKED`/`ACCOUNT_SUSPENDED` (mavjud),
  `PHONE_EXISTS` (mavjud, Bosqich 20'dan), `TOKEN_EXPIRED` (mavjud,
  avval faqat refresh token uchun — endi grant uchun ham qayta
  ishlatiladi, xuddi shunday "qaytadan boshlang" semantikasi).
- **`POST /me/change-password`** — YANGI, lekin YANGI FEATURE EMAS:
  frontend `AccountSecurity.tsx` va `usersService.changePassword()`
  ALLAQACHON to'liq yozilgan edi (`INVALID_CURRENT_PASSWORD` xato kodi
  ALLAQACHON `ERROR_CODES`da bor edi) — Bosqich 2'dan beri `disabled()`
  bilan stub qilib qo'yilgan, chunki almashtiradigan parol umuman yo'q
  edi. Endi `AuthService.changePassword` bilan bog'landi (parolni
  UNUTGAN emas, BILGAN holda almashtirish — reset'dan farqli, boshqa
  sessiyalar bekor QILINMAYDI). Frontend validatsiyasi ham backend bilan
  moslashtirildi (composition-qoidalar olib tashlandi, faqat min-8 +
  whitespace-only tekshiruvi qoldi).

### Frontend routes

```text
/kirish                      — LOGIN: telefon + parol (SMS YO'Q)
/parolni-unutdim              — FORGOT: telefon → SMS OTP so'raladi
/parolni-unutdim/tasdiqlash   — FORGOT: OTP tasdiqlash → resetToken
/parolni-unutdim/parol        — FORGOT: yangi parol → complete → /kirish
                                 (sessiya AVTOMATIK OCHILMAYDI)

/royxatdan-otish              — REGISTER: telefon → SMS OTP so'raladi
/royxatdan-otish/tasdiqlash   — REGISTER: OTP tasdiqlash → registrationToken
/royxatdan-otish/parol        — REGISTER: parol → complete → /rol-tanlash
                                 (PHONE_EXISTS → "Kirishni xohlaysizmi?" CTA)
```

Eski `/kirish/tasdiqlash` (login OTP verify) sahifasi BUTUNLAY o'chirildi
— login endi OTP bosqichisiz. `app/xaridor/layout.tsx`/
`app/mutaxassis/layout.tsx`/`app/(auth)/rol-tanlash/page.tsx`dagi
`session.verified` tekshiruvlari (bu sahifaga yo'naltirar edi) ham olib
tashlandi — yangi arxitekturada `verified` HAR DOIM `true` (tasdiqlash
hisob yaratishning o'zida sodir bo'ladi), demak bu shoxobchalar
ERISHIB BO'LMAYDIGAN (dead) kod edi.

`sessionStorage` kalitlari (ikkala oqim ham mustaqil, intent
chalkashib ketmasin): `bd_register_otp_phone`/`bd_registration_token`
(REGISTER), `bd_reset_otp_phone`/`bd_reset_token` (FORGOT),
`bd_prefill_phone` (CTA'lar orasidagi telefon prefill — o'zgarmagan).

### Testlar

- **Backend unit** (`auth.service.spec.ts`, fake Prisma/Otp/Grant/Hash):
  register (request/verify/complete, parollar mos emas, grant eskirgan,
  P2002→PHONE_EXISTS), login (to'g'ri, noto'g'ri parol, mavjud emas
  telefon dummy-hash bilan, legacy passwordHash=null, BLOCKED,
  SUSPENDED muddatli/muddatsiz, rate-limit parolni UMUMAN tekshirmaydi),
  password-reset (skipDelivery mavjud/mavjud emas, grant userId bilan,
  complete — sessiya bekor qilinishi + audit).
- **Backend e2e** (`test/auth.e2e-spec.ts`, real Postgres+Redis, 48 test):
  aniq SMS SONI tekshiruvi (register=1, 5×login=0 qo'shimcha, reset=1),
  **10 ta MUSTAQIL grant bilan parallel `/register/complete` → FAQAT
  bitta User** (haqiqiy DB unique constraint ostida — Bosqich 20'dagi
  "bir xil kod" testidan KO'RA to'g'ridan-to'g'ri P2002 shoxobchasini
  sinaydi, chunki har bir grant o'z tokeni bo'yicha MUSTAQIL topiladi),
  grant single-use/expiry, purpose-binding (REGISTER OTP reset'da
  ishlamaydi), reset'dan keyin eski refresh sessiya ishlamay qolishi,
  legacy (passwordHash=null) user login VA forgot-password orqali
  onboarding sifatida ishlashi, login rate-limit, eski regressiyalar
  (refresh rotatsiya/reuse, rol tanlash, sessiya egaligi).
- **Frontend Playwright** (`tests/e2e/auth.spec.ts`, 7 test): to'liq
  REGISTER (OTP→parol→rol tanlash→dashboard), to'liq LOGIN (OTP
  sahifasiga UMUMAN o'tilmasligi tasdiqlangan), noto'g'ri parol,
  "hisob allaqachon mavjud" CTA (parol bosqichida), to'liq FORGOT
  PASSWORD (eski parol ishlamay qolishi, yangisi ishlashi).
  `tests/e2e/helpers.ts#registerViaUi` 3-bosqichli oqimga yangilandi,
  `loginViaUi` endi parol bilan; `tests/e2e/admin-helpers.ts#
  registerFixtureToken` (avvalgi `otpLoginToken`) ham to'liq
  request-otp→verify-otp→complete zanjiriga o'tkazildi.

### SMS xarajat modeli (tasdiqlangan)

| Amal | SMS soni |
|---|---|
| Yangi ro'yxatdan o'tish | 1 |
| Oddiy login | 0 |
| 5 marta ketma-ket login | 0 (qo'shimcha) |
| Parolni unutish | 1 |
| Parolni unutish (noma'lum telefon) | 0 (public javob bir xil) |

## 22. TextUp SMS provider integratsiyasi (Bosqich 23)

### Auth — email/parol → Bearer accessToken (Basic auth EMAS)

TextUp'ning ikkita ALOHIDA hosti bor: auth (`api-auth.textup.uz`) va SMS
(`sms-api.textup.uz`). Birinchi taxmin (Basic auth, bitta host,
`POST /v1/messages`) NOTO'G'RI chiqdi — TextUp haqiqiy hujjati quyidagi
oqimni talab qiladi:

```text
POST {TEXTUP_AUTH_URL}   (https://api-auth.textup.uz/v1/login)
  { "email": ..., "password": ... }
  → { accessToken, refreshToken, user: { id, status } }

POST {TEXTUP_SMS_URL}    (https://sms-api.textup.uz/v1/send)
  Authorization: Bearer <accessToken>
  { message, userId, name, recipients: ["+998..."], templateId?, nicknameId? }
  → { smsId }
```

- **`userId`** — SMS so'rovida YUBORILADIGAN qiymat HAR DOIM runtime login
  javobidagi `user.id` (ENV'dan EMAS — boshqa loyihadan ID "ko'chirib
  olish" ATAYLAB QILINMADI). `TEXTUP_EXPECTED_USER_ID` — ixtiyoriy,
  qo'shimcha hisob-xavfsizlik assertioni: berilsa, runtime `user.id` bilan
  solishtiriladi, mos kelmasa fail-closed (`textup-token-manager.ts`).
- **Token kesh** — `TextUpTokenManager`, bitta jarayon xotirasida
  (Redis/DB shart emas, `SmsModule`dagi `SMS_PROVIDER` singleton). Bir
  vaqtli chaqiruvlar (masalan 10 ta SMS bir vaqtda navbatdan chiqsa)
  BITTA in-flight login promise'ni baham ko'radi — 10 ta alohida login
  SO'ROVI YO'Q. Login muvaffaqiyatsiz bo'lsa promise/kesh tozalanadi,
  keyingi chaqiruv qayta urinadi.
- **401 → BIR MARTA qayta urinish** (`textup.provider.ts`): SMS so'rovi
  401 qaytarsa — token invalidate qilinadi, qayta login qilinadi, SMS
  BIR MARTA qayta yuboriladi. Ikkinchi 401 — muvaffaqiyatsiz, cheksiz
  aylanma YO'Q. Hujjatlashtirilmagan refresh-token endpoint O'YLAB
  TOPILMAGAN — `refreshToken` ishlatilmaydi.
- **Timeout'da ko'r-ko'rona qayta yuborish YO'Q**: tarmoq xatosi/timeout
  — RETRYABLE deb belgilanadi (`permanent` berilmaydi), lekin provider
  ICHIDA ikkinchi HTTP chaqiruv qilinmaydi — qayta urinish OTP
  navbatining o'zi (bounded, mavjud siyosat o'zgarmagan).

### Xabar matni — moderatsiyaga ANIQ mos kelishi shart

**E'TIBOR (2026-09-17 tuzatildi)**: dastlabki taxmin (`"BOBODODA
tasdiqlash kodi: ..."`, qisqa) TextUp moderatsiyasi tomonidan HAQIQATDA
RAD ETILGAN edi ("Rad etildi: Yo'riqnomadagi Punkt 2 dan foydalanib yozib
bering") — bu `GET /v1/templates`ning HAQIQIY javobidan (pastga qarang)
tasdiqlangan, taxmin emas. Haqiqatda TASDIQLANGAN (`status:"active"`)
matn UZUNROQ:

```text
Ro'yxatdan o'tish: BOBODODA saytida ro'yxatdan o'tish uchun tasdiqlash kodi: <6 raqam>
Parolni tiklash:   BOBODODA saytida parolni tiklash uchun tasdiqlash kodi: <6 raqam>
```

`renderTextUpText()` shu ANIQ matnga moslashtirilgan (`textup-text.util.ts`).
`name` maydoni (ichki operatsion yorliq, SMS matni EMAS) — o'zgarmagan:
`"BoboDoda Registration OTP"` / `"BoboDoda Password Reset OTP"`.

### Hisob holati (2026-09-17, real API javoblari bilan tasdiqlangan)

| Element | TextUp nomi | Holat |
|---|---|---|
| Shablon (ro'yxatdan o'tish) | `BOBODODA Registration OTP` | **`active`** (tasdiqlangan) |
| Shablon (parolni tiklash) | `BOBODODA Password Reset OTP` | **`active`** (tasdiqlangan) |
| Alpha-nom | `BOBODODA` | **`in_verify`** (`GET /v1/nick-names` orqali tekshirilgan — hali tasdiqlanmagan) |

Har ikkala shablonning ESKI, qisqa varianti (`status:"cancelled"`,
xuddi shu rad etish sababi bilan) ham hisobda saqlangan — bu ATAYLAB
qoldiriladi (TextUp o'zi arxivlaydi), kod FAQAT `active` yozuvni
tanlaydi. `TEXTUP_REGISTRATION_TEMPLATE_ID`/`TEXTUP_PASSWORD_RESET_
TEMPLATE_ID` lokal `.env`ga yozilgan (haqiqiy UUID qiymatlar — bu faylga
QAYTA YOZILMAYDI, faqat `.gitignore`dagi `backend/.env`da; Railway'ga
ham xuddi shu ikkita ID qo'yiladi production deploy vaqtida).
`TEXTUP_NICKNAME_ID` ATAYLAB SOZLANMAGAN (alpha-nom hali `in_verify`) —
tasdiqlangach `GET /v1/nick-names`ni qayta ishga tushiring va `id`ni
qo'shing.

**Haqiqiy SMS YUBORILDI VA TASDIQLANDI (2026-09-17, bitta test)** —
to'liq oqim: real `POST /auth/register/request-otp` → `sms_logs`da
`success=true`+real `providerMessageId` → foydalanuvchi haqiqiy SMS'ni
o'qib, matnni tasdiqladi (tasdiqlangan shablon bilan so'zma-so'z mos) →
real `POST /auth/register/verify-otp` (foydalanuvchi o'qigan kod bilan)
→ `registrationToken` qaytdi. Jami 1 ta real SMS. Tafsilot:
PRODUCTION-READINESS.md §21 (`TEXTUP_REAL_SMS_VERIFIED: PASS`).

### Real API'dan tasdiqlangan tafsilotlar (taxmin emas)

- **`GET /v1/templates`ga `userId` YETARLI EMAS** — API o'zi ikkita
  qo'shimcha MAJBURIY query-parametrni talab qiladi (400 javobidan
  kashf etilgan, hujjatda yozilmagan): `page` va `limit`
  (`?userId=...&page=1&limit=100`).
- **Javob shakli tekis massiv EMAS** — `{ count, in_verify_count,
  templates: [...] }`. Har bir yozuvda `status` (`active`/`cancelled`/
  `in_verify`), `content` (yuborilganda ko'rinadigan matn, joy egasi
  bilan), `verifiedContent` (tasdiqlangan regex-shakl, `%w+` — dinamik
  qism), `reason` (rad etilgan bo'lsa TextUp'ning izohi).

### Moderatsiya/kashfiyot qadamlar (bajarilgan qismi belgilangan)

```bash
# 1. Login (email/parol — TEXTUP_EMAIL/PASSWORD) — BAJARILDI 2026-09-17,
#    accessToken/parol HECH QACHON konsolga chiqarilmadi.
curl -s -X POST https://api-auth.textup.uz/v1/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$TEXTUP_EMAIL"'","password":"'"$TEXTUP_PASSWORD"'"}' \
  | tee /tmp/textup-login.json | jq -r '.accessToken' > /tmp/textup-token.txt
# 2. O'z shablonlarini top — BAJARILDI. `page`/`limit` MAJBURIY (yuqoriga
#    qarang), FAQAT status="active" qabul qilinadi, "in_verify"/"cancelled" EMAS.
curl -s "https://api-auth.textup.uz/v1/templates?userId=$(jq -r '.user.id' /tmp/textup-login.json)&page=1&limit=100" \
  -H "Authorization: Bearer $(cat /tmp/textup-token.txt)" \
  | jq '.templates[] | select(.status=="active") | {name, id, status}'
rm -f /tmp/textup-login.json /tmp/textup-token.txt   # token faylni darhol o'chiring
# 3. O'z nicknameId'ni top — BAJARILDI 2026-09-17: "BOBODODA" topildi,
#    lekin status="in_verify" (hali tasdiqlanmagan) — shuning uchun
#    TEXTUP_NICKNAME_ID SOZLANMADI (qisqa raqamdan yuborishga qoldirildi,
#    bu ham TO'G'RI). `GET /v1/nick-names` HAM `page`/`limit` talab qiladi
#    (2-qadamdagi bilan bir xil naqsh) va javob { count, nickNames: [...] }
#    shaklida (tekis massiv emas):
curl -s "https://api-auth.textup.uz/v1/nick-names?userId=<runtime user.id>&page=1&limit=100" \
  -H "Authorization: Bearer <accessToken>" | jq '.nickNames[] | {name, id, status}'
# → status="active" bo'lsa: Railway/.env'ga TEXTUP_NICKNAME_ID=<id> qo'ying.
# 4. Bitta nazorat qilinadigan REAL ro'yxatdan o'tish SMS testi —
#    BAJARILDI VA MUVAFFAQIYATLI 2026-09-17 (yuqoridagi "Haqiqiy SMS
#    YUBORILDI" bandiga qarang). DIQQAT (kelajakda takrorlash uchun):
#    dev backend'ni oddiy `npm run start:dev` bilan ishga tushirish
#    `.env`dagi SMS_PROVIDER=TEXTUP'ni AVTOMATIK o'qiydi (real SMS
#    yuboriladi!) — shuning uchun bu test ANIQ `SMS_PROVIDER=TEXTUP
#    DEV_EXPOSE_OTP=false npm run start:dev` bilan, ALOHIDA backend
#    instansida bajarildi, keyin `SMS_PROVIDER=CONSOLE DEV_EXPOSE_OTP=true`
#    bilan xavfsiz holatga qaytarildi. Buni Playwright/avtomatlashtirilgan
#    test uchun ISHLATMANG, faqat qo'lda, bitta oqim uchun.
# 5. "Parolni unutdim" SMS testi — HALI BAJARILMAGAN (bo'lim 6:
#    "registratsiya testi muvaffaqiyatli bo'lmaguncha kutish" — endi
#    muvaffaqiyatli, lekin foydalanuvchi alohida ruxsat berishi kerak).
```

**Xavfsizlik eslatmasi (2026-09-17 topilgan, tuzatilgan)**: `backend/
test/jest-e2e.setup.ts` avval `DEV_EXPOSE_OTP`ni pin qilardi, lekin
`SMS_PROVIDER`ni EMAS — developer `.env`sida haqiqiy `SMS_PROVIDER=
TEXTUP` bo'lsa, `dotenv` allaqachon o'rnatilgan kalitni qayta yozmasligi
sababli bu qiymat Jest e2e suite'ga SIZIB O'TARDI, va REGISTER/PASSWORD_
RESET oqimini sinovchi HAR BIR e2e test (ular to'liq `AppModule`ni,
shu jumladan `OtpSmsProcessor` BullMQ worker'ini ko'taradi) HAQIQIY SMS
yuborib yuborardi. Tuzatildi: `jest-e2e.setup.ts` endi `SMS_PROVIDER`ni
HAM `'CONSOLE'`ga pin qiladi (`DEV_EXPOSE_OTP` bilan bir xil falsafa) —
e2e endi HAR DOIM ambient `.env`dan mustaqil, real tarmoq chaqiruvisiz.
Bu himoya Jest e2e uchun avtomatik; Playwright/qo'lda `npm run start:dev`
uchun EMAS — o'sha holatda operator o'zi `SMS_PROVIDER=CONSOLE` bilan
qayta ishga tushirishi kerak (yuqoridagi 4-qadam eslatmasiga qarang).

### Ishlatilmagan/rad etilgan yondashuvlar (bilib qo'yish uchun)

- **Config'dan `userId` yuborish** (login javobidan EMAS) — ikkinchi
  spetsifikatsiya iteratsiyasida ko'rib chiqilgan, keyin referens
  integratsiyaga moslashtirilib bekor qilingan: runtime `user.id`
  haqiqiy manba, config faqat ixtiyoriy xavfsizlik tekshiruvi.
- **Bitta umumiy `TEXTUP_TEMPLATE_ID`** — rad etildi: ikkita ALOHIDA
  moderatsiya matni (ro'yxatdan o'tish/parolni tiklash) ikkita ALOHIDA
  ID talab qiladi, aralashtirib bo'lmaydi.
- **`"BOBO&DODA"`/`"Bobo&Doda"` (ampersand bilan) SMS matnida** — rad
  etildi: moderatsiyaga aynan `"BOBODODA"` (bitta so'z) topshirilgan,
  boshqa formatlash tasdiqlangan shablonga mos kelmasligi mumkin.

## 23. Railway production deploy (Bosqich 23)

### Xizmat topologiyasi

```text
Railway loyihasi "Bobo-Doda" (workspace: Laziz Shakarov's Projects)
└─ production environment
   ├─ backend   — Dockerfile (backend/Dockerfile), build konteksti backend/
   ├─ frontend  — Nixpacks (avtomatik aniqlangan, root next build/next start)
   ├─ Postgres  — private: postgres.railway.internal:5432
   └─ Redis     — private: redis.railway.internal:6379
```

**Backend Dockerfile — MUHIM**: `backend/`ning o'zining alohida
`package-lock.json`i bor (npm workspaces monorepo bo'lsa ham — backend
HECH QANDAY workspace paketiga bog'liq EMAS, shuning uchun standalone
lockfile xavfsiz va to'g'ri). Build konteksti `backend/`ning O'ZI
(`railway up backend --path-as-root --service backend`), ROOT EMAS —
aks holda `backend/Dockerfile`ning `COPY package.json package-lock.json`
qatori muvaffaqiyatsiz bo'ladi.

**Domen porti — DIQQAT**: Railway HAR IKKALA xizmatga o'zining ichki
`PORT` (odatda `8080`) o'zgaruvchisini avtomatik beradi — bu `EXPOSE`
Dockerfile'da yozilgan qiymatdan (backend: 4000) YOKI odatiy Next.js
qiymatidan (frontend: 3000) FARQ QILISHI mumkin. Domen yaratilgandan
keyin HAQIQIY tinglanayotgan portni loglardan tasdiqlang
(`railway logs --service <nom>`, "Local: http://localhost:XXXX" qatori)
va `railway domain update <domen> --port <XXXX> --service <nom>` bilan
moslashtiring — aks holda 502 "Application failed to respond" (bu holat
haqiqatan yuz berdi va tuzatildi, ikkala xizmatda ham).

### DB rollarini bootstrap qilish (bir martalik, Railway Postgres'da)

Railway Postgres'ning `DATABASE_URL`/`PGUSER` — superuser (`postgres`)
darajasida. `bobododa_app`/`bobododa_migrator` (RUNBOOK §3) shu superuser
orqali BIR MARTA yaratiladi:

```bash
# 1. SSH tunnel (Railway private DB'ga tashqaridan yagona xavfsiz yo'l —
#    public proxy YO'Q, faqat shu tunnel; SSH kalit ro'yxatdan o'tgan bo'lishi kerak):
railway connect postgres --tunnel-only
# → mahalliy port + superuser parolini chiqaradi

# 2. Rollarni yaratish (roles.sql, RUNBOOK §3):
psql "postgresql://postgres@127.0.0.1:<port>/railway" \
  -v app_pw="$(openssl rand -base64 24)" \
  -v migrator_pw="$(openssl rand -base64 24)" \
  -v db_name=railway -v app_role=bobododa_app -v migrator_role=bobododa_migrator \
  -f prisma/sql/roles.sql

# 3. Migratsiya (xuddi shu tunnel orqali, migrator rol bilan):
DATABASE_MIGRATION_URL="postgresql://bobododa_migrator:<pw>@127.0.0.1:<port>/railway?schema=public" \
DATABASE_URL="postgresql://bobododa_app:<pw>@127.0.0.1:<port>/railway?schema=public" \
  npx prisma migrate deploy

# 4. Backend Railway o'zgaruvchilariga PRIVATE domen bilan yozing (tunnel
#    portiga EMAS — u faqat bir martalik admin ishi uchun):
#    DATABASE_URL=postgresql://bobododa_app:<pw>@postgres.railway.internal:5432/railway?schema=public
#    DATABASE_MIGRATION_URL=postgresql://bobododa_migrator:<pw>@postgres.railway.internal:5432/railway?schema=public
```

**Tekshiruv (haqiqiy Railway DB'da bajarilgan)**: `bobododa_app` bilan
`SELECT` ✓ ishlaydi, `CREATE TABLE` ✗ "permission denied for schema
public", `UPDATE ledger_entries` ✗ "permission denied for table
ledger_entries" — append-only himoya kod darajasida EMAS, DB darajasida
tasdiqlangan.

### Backup + Restore drill protokoli

```bash
# Backup — Railway Postgres versiyasiga MOS pg_dump kerak (versiya
# mos kelmasa pg_dump rad etadi — "aborting because of server version
# mismatch"; Railway 2026-09 holatida PostgreSQL 18):
nix-shell -p postgresql_18 --run "pg_dump '<tunnel-URL>' --format=custom --no-owner --no-privileges --file=backup.dump"

# Restore — YANGI, IZOLYATSIYALANGAN DB'ga (production'ga EMAS):
createdb -h 127.0.0.1 -U <local-superuser> restore_drill
pg_restore --host=127.0.0.1 --username=<local-superuser> --dbname=restore_drill --no-owner --no-privileges backup.dump

# Tekshirish — schema joriy ekanligi:
DATABASE_URL=".../restore_drill" DATABASE_MIGRATION_URL=".../restore_drill" npx prisma migrate status
# → "Database schema is up to date!" kutiladi

# Tozalash:
dropdb -h 127.0.0.1 -U <local-superuser> restore_drill
```

**DIQQAT**: bu qo'lda drill — mexanizmning o'zini tasdiqlaydi. Railway'ning
DOIMIY, avtomatik/jadvalli backup xususiyati FAQAT dashboard orqali
yoqiladi (Postgres xizmati → Backups) — CLI'da bunday buyruq yo'q
(`railway --help` bo'yicha tekshirilgan). Bu operator uchun ANIQ,
qolgan qadam.

### PAYMENTS_ENABLED — real Payme credential kelgunga qadar

```bash
# Hozirgi xavfsiz production konfiguratsiya:
railway variable set PAYMENTS_ENABLED=false --service backend

# Real Payme credential kelganda:
railway variable set PAYMENTS_ENABLED=true --service backend
railway variable set PAYMENT_PROVIDER=PAYME --service backend
railway variable set PAYME_MERCHANT_ID=<qiymat> PAYME_LOGIN=<qiymat> PAYME_KEY=<qiymat> PAYME_CHECKOUT_URL=<qiymat> --service backend
# Keyin: railway up backend --path-as-root --service backend (yoki redeploy)
```

Kod o'zgarishi SHART EMAS — `payment.module.ts` avtomatik `PaymeProvider`ga
o'tadi (`PAYMENTS_ENABLED`/`PAYMENT_PROVIDER`ni tekshirib).

## 24. Domen bo'linishi (Bosqich 23) — bobododa.uz / app / api

### Egalik
- **Vercel** (`bobo-doda` loyihasi, `prj_IuWC7zsb2aGnTeGe0P0SLIm1LaZ1`) —
  FAQAT `bobododa.uz` + `www.bobododa.uz` (landing + huquqiy/FAQ/yordam).
- **Railway** (`Bobo-Doda` loyihasi) — `frontend` (`app.bobododa.uz`),
  `backend` (`api.bobododa.uz`), Postgres, Redis — HAMMASI shu yerda.
- **DNS** — AHOST (`rdns1/2/3.ahost.uz`), Vercel/Railway nazorat qilmaydi.

### Railway custom domain qo'shish (bir martalik, boshqa domen kerak bo'lsa)
```bash
railway domain <sub>.bobododa.uz --service <frontend|backend> --port 8080
# Chiqargan CNAME + TXT (_railway-verify.<sub>) yozuvlarini AHOST'da qo'shing.
# TXT — FAQAT bir martalik egalik tasdiqlash uchun; tasdiqlangandan keyin
# saqlansa ham, o'chirilsa ham keyingi ishlashga ta'sir qilmaydi.
railway domain status <sub>.bobododa.uz --service <nom>   # Verified: yes / Certificate: VALID kutiladi
```
DIQQAT — AHOST'da ba'zan yangi TXT yozuv authoritative nameserver'ning
BARCHA tugunlarida bir vaqtda ko'rinmasligi mumkin (klaster ichi kechikish):
`dig TXT ... @rdns1.ahost.uz` bo'sh qaytarsa ham, Railway'ning o'zi allaqachon
`Verified: yes` deb belgilashi mumkin — HAQIQIY tekshiruv har doim `curl`
(bypass'siz) bilan TLS sertifikatini tekshirish (`subject: CN=<domen>` mos
kelishi kerak, xatosiz).

### `NEXT_PUBLIC_API_URL` o'zgartirilganda — MUHIM
Bu BUILD VAQTIDA o'qiladigan qiymat (Next.js `NEXT_PUBLIC_*` konvensiyasi).
```bash
railway variable set NEXT_PUBLIC_API_URL=https://api.bobododa.uz --service frontend --skip-deploys
railway redeploy --service frontend --from-source --yes   # --from-source SHART!
```
`--from-source`siz oddiy `railway redeploy` faqat ESKI build image'ni qayta
ishga tushiradi — yangi qiymat JS bundle'ga hech qachon kirmaydi (backend'dagi
`CORS_ORIGINS` kabi RUNTIME o'zgaruvchilar uchun esa oddiy redeploy yetarli).

### Vercel landing-only deploy
```bash
vercel link --project bobo-doda --scope shakarovlaziz243-5791s-projects  # bir martalik
vercel deploy --prod --yes   # mavjud loyihaga, YANGI loyiha yaratmaydi
```
`.vercelignore` MAVJUD — mavjud bo'lgach `.gitignore` E'TIBORGA OLINMAYDI,
shuning uchun `node_modules/`, `.next*/`, `backend/node_modules` va h.k.
BARCHASI shu faylda ANIQ yozilgan bo'lishi kerak (aks holda 100MB fayl
chegarasidan yiqiladi — bir marta shunday bo'lgan, `.next` webpack cache
fayli 100MB dan katta edi).

Landing-only marshrut cheklovi (`next.config.mjs`ning `redirects()`)
`process.env.VERCEL === "1"` bilan avtomatik ishlaydi — Vercel'ning o'zi bu
flag'ni har bir build'ga beradi, qo'shimcha sozlash SHART EMAS. Railway'dagi
build bu flag'ga ega EMAS, shuning uchun xuddi shu kod Railway'da hech qanday
redirect qo'shmaydi.

### Rollback
**Vercel landing** — oldingi deploy'ga qaytarish:
```bash
vercel ls bobo-doda --prod          # oldingi deployment ID/URL toping
vercel promote <oldingi-deployment-url>   # yoki dashboard: Deployments → ... → Promote to Production
```
**Railway frontend/backend** — oldingi (ishlaydigan) deployment'ga qaytarish:
```bash
railway status --json   # activeDeployments ro'yxatidan oldingi ID
# Dashboard orqali: Deployments → oldingi qatorda "Redeploy"
```
**DNS** — `app`/`api` CNAME yozuvlarini AHOST'dan o'chirish (Railway'dagi
custom domain'lar ham `railway domain delete` bilan olib tashlanadi) —
xom Railway domenlar (`*.up.railway.app`) HAR DOIM ishlab turadi, cutover
bekor qilinsa ham foydalanuvchilar uchun zaxira yo'l bo'lib qoladi.
CORS_ORIGINS'da ikkalasi (custom + xom domen) ham saqlanganidan, xom domenga
qaytish CORS o'zgarishini talab qilmaydi.

## 25. Release jarayoni — HAQIQIY holat (Bosqich 24 audit topilmasi)

**MUHIM — hujjatlashtirilgan "develop → CI → main → production" oqimi
HAQIQATDA MAVJUD EMAS.** Tekshirilgan (taxmin emas):
- `main` — `develop`dan **40 commit ORQADA**, oxirgi commit "feat(backend):
  stage 1 foundation" (loyihaning eng boshidan). `main`ga hech qachon PR
  merge qilinmagan (`gh pr list --base main --state merged` — bo'sh).
- Railway `frontend`/`backend` xizmatlari HECH QANDAY git manba bilan
  ulanmagan (`railway service source` — bog'lanish yo'q) — deploy FAQAT
  qo'lda, CLI orqali (`railway up`/`railway redeploy --from-source`).
  Git push'ning o'zi HECH NARSANI deploy qilmaydi.

**Haqiqiy oqim**: `develop`ga push → CI (`backend-ci.yml`/`ci.yml`/
`codeql.yml`) avtomatik ishga tushadi (endi TO'LIQ yashil — Bosqich 23/24
tuzatishlaridan keyin) → **operator qo'lda** `railway up`/`railway
redeploy --from-source` orqali deploy qiladi. `develop`dagi kod bilan
production'da ISHLAYOTGAN kod orasida HECH QANDAY avtomatik kafolat yo'q
— muvofiqlik faqat operator DISTSIPLINASIGA bog'liq (har push'dan keyin
deploy qilishni eslab qolish).

**`main` branch protection — yangilandi** (Bosqich 24): `required_status_checks`
endi HAQIQIY, CI'da tasdiqlangan 4 ta check nomi bilan sozlangan (`Lint ·
Typecheck · Unit · Contracts`, `Integration (real Postgres 16 + Redis —
service containers)`, `Production Build`, `Code Quality & Security`) —
ilgari bu ATAYLAB bo'sh qoldirilgan edi, chunki CI ishonchsiz edi (bo'lim
23'da tuzatilgan ikkita CI xatosi). `enforce_admins: false` — bu ataylab,
chunki HALI PR oqimi qo'llanilmaydi, admin bloklanib qolmasin. `main`
haqiqatan ishlatila boshlasa (git-asosli deploy'ga o'tilsa), shu bandni
qayta ko'rib chiqing.

**Tavsiya (bajarilmadi — arxitektura qarori, operator tasdig'i kerak)**:
Railway xizmatlarini GitHub'ga ulash (`railway service source connect
--repo Lazizdeveloper/Bobo-Doda --branch develop`) — shunda push avtomatik
deploy qiladi, har doim "nima push qilingan — o'sha ishlayapti" kafolati
bo'ladi. Hozircha bajarilmadi, chunki bu deploy MODELINI tubdan o'zgartiradi
(CLI qo'lda nazoratidan avtomatikka) — operatorning ochiq roziligisiz
qilinmadi.

### Rollback — ilova darajasi (real, sinovdan o'tgan yo'l)

Railway `redeploy` FAQAT "oxirgi" deployment'ni qayta ishga tushiradi,
ESKI (REMOVED holatidagi) deployment'ni ID bo'yicha tanlab qayta tiklash
uchun CLI buyrug'i YO'Q (tekshirilgan — `railway deployment`/`railway
redeploy --help`da yo'q). Haqiqiy, ishlaydigan yo'l — kodni orqaga qaytarib
QAYTA DEPLOY qilish:

```bash
# Muammoli commit'dan OLDINGI yaxshi commit'ni toping:
git log --oneline -10

# O'sha holatga vaqtincha o'tib, qayta deploy qiling:
git checkout <yaxshi-commit-sha> -- .   # yoki: git worktree add ../rollback <sha>
railway up backend --path-as-root --service backend --ci   # yoki frontend uchun mos buyruq
git checkout develop -- .               # ishchi papkani qaytaring

# Tasdiqlash:
curl https://api.bobododa.uz/health/ready
```
Railway dashboard'ida ham "Deployments" ro'yxatida eski (hali REMOVED
bo'lmagan) deployment qatorida "Redeploy" tugmasi bor — bu tezroq, lekin
CLI'dan tekshirib bo'lmaydi (dashboard-only).

### Migratsiya insident protokoli — FORWARD-FIX (DB rollback XAVFSIZ EMAS)

**Bu loyihada `down` migratsiya YO'Q** (tekshirilgan — 21 ta migratsiya
papkasining birortasida ham `down.sql` yo'q; bu Prisma'ning standart
konvensiyasi, ataylab shunday qoldirilgan). Bu shuni anglatadi: **migratsiyani
"orqaga qaytarish" degan xavfsiz, umumiy buyruq YO'Q.** Muammoli migratsiya
production'ga qo'llanilgan bo'lsa:

1. **HECH QACHON** `prisma migrate resolve --rolled-back` yoki qo'lda
   `DROP TABLE`/`ALTER TABLE ... DROP COLUMN` bilan "orqaga qaytarishga"
   urinmang — bu keyingi migratsiyalar bilan mos kelmay qolishi va
   `_prisma_migrations` jadvalini haqiqiy schema holatidan uzib qo'yishi
   mumkin.
2. **FORWARD-FIX**: muammoni TUZATUVCHI YANGI migratsiya yozing (masalan
   noto'g'ri `NOT NULL` cheklovi qo'shilgan bo'lsa — uni olib tashlovchi
   YANGI migratsiya, ustun noto'g'ri turda bo'lsa — uni to'g'ri turga
   o'tkazuvchi YANGI migratsiya). Bu — standart, xavfsiz yo'l, chunki
   `_prisma_migrations` tarixi UZLUKSIZ qoladi va boshqa muhitlar (CI,
   boshqa operator mashinasi) bilan sinxronligicha qoladi.
3. **Agar FORWARD-FIX yetarli emas** (masalan migratsiya HAQIQIY ma'lumotni
   yo'qotgan bo'lsa — noto'g'ri `DELETE`/ustunni tashlab yuborish real
   qatorlar bilan): bu ENDI "migratsiya muammosi" emas, **ma'lumot
   yo'qotish insidenti** — RUNBOOK §23'dagi PITR orqali ANIQ vaqtga
   (muammoli migratsiyadan OLDIN) IZOLYATSIYALANGAN yangi xizmatga
   `railway postgres pitr restore --at <vaqt> --new-service-name
   <nom>` bilan tiklang, yo'qolgan ma'lumotni O'SHA yerdan **qo'lda**
   (kerakli jadval/qatorlarni) production'ga qaytaring — **HECH QACHON**
   butun production DB'ni almashtirmang (bu boshqa, muammosiz jadvallardagi
   YANGI yozuvlarni yo'qotadi). Bu — oxirgi chora, ma'lumot yo'qotishni
   qabul qiluvchi yo'l, muntazam vosita EMAS.
4. Har ikkala holatda ham: `npx prisma migrate status` bilan production
   holatini TASDIQLANG (drift yo'qligini), keyin `boot-check.ts` orqali
   yangi backend versiyasi to'g'ri ko'tarilishini tekshiring — kodni
   deploy qilishdan OLDIN.

**Sinovdan o'tgan (Bosqich 24)**: PITR restore mexanizmining o'zi izolyatsiyalangan
muhitda haqiqiy sinovdan o'tkazildi (bo'lim 23) — schema/ma'lumot/rol
yaxlitligi tasdiqlangan. Bu YUQORIDAGI 3-qadamning ASOSI ishlashini
isbotlaydi, lekin "qo'lda tanlab production'ga qaytarish" qismi
(3-qadamning ikkinchi yarmi) hali HAQIQIY insidentda sinovdan o'tmagan —
bu operatsion protokol, avtomatlashtirilgan skript emas.

## 26. Nazoratli release protokoli (Bosqich 24 — yopildi)

Bo'lim 25'dagi topilmadan keyin qat'iylashtirilgan, HAQIQIY oqim (Railway
git'ga ATAYLAB ulanmadi — bu deploy MODELINI o'zgartiradi, operator ochiq
roziligisiz qilinmaydi; qo'lda deploy, lekin endi to'liq nazorat ostida):

```
develop (har push'da CI avtomatik) 
  → 4 ta majburiy check yashil bo'lishi SHART
    (Lint · Typecheck · Unit · Contracts, Integration, Production Build,
     Code Quality & Security)
  → PR develop → main (`gh pr create --base main --head develop`)
  → main branch protection PR'ni majburiy checklar o'tmasdan merge
    qilishga YO'L QO'YMAYDI (`required_status_checks`, Bosqich 24'da
    sozlangan — ilgari BO'SH edi, CI ishonchsiz bo'lgani uchun)
  → merge (force-push va branch o'chirish BLOKLANGAN —
    `allow_force_pushes: false`, `allow_deletions: false`)
  → ATAYLAB QO'LDA production deploy (quyida)
```

### Production deploy — aniq qadamlar

```bash
# 1. main'dagi ANIQ commit'ni aniqlang (bu deploy qilinadigan versiya):
git fetch origin main && SHA=$(git rev-parse origin/main)
echo "Deploy qilinayotgan commit: $SHA"

# 2. Backend — commit'ni GIT_COMMIT_SHA sifatida belgilab, o'sha holatdan deploy:
git checkout $SHA -- .   # yoki: git worktree add ../deploy $SHA
railway variable set GIT_COMMIT_SHA="$SHA" --service backend --skip-deploys
railway up backend --path-as-root --service backend --ci

# 3. Frontend (agar o'zgargan bo'lsa):
railway up --service frontend --ci

# 4. Ishchi papkani qaytaring:
git checkout develop -- .
```

### Deploy qilingan commit'ni tashqaridan tasdiqlash (Bosqich 24 — yangi)

`/health/live` endi `commit` maydonini qaytaradi (`GIT_COMMIT_SHA` orqali,
`backend/src/modules/health/health.controller.ts`) — bu SECRET EMAS
(commit hash o'zi maxfiy emas), shuning uchun HAR KIM tashqaridan
tekshira oladi:

```bash
curl -s https://api.bobododa.uz/health/live | jq .commit
# Solishtiring: git rev-parse origin/main
```
Agar ikkalasi mos kelmasa — production ESKI (yoki BOSHQA) commit bilan
ishlayapti, degani. Haqiqiy sinov (Bosqich 24): deploy qilib, mos kelishi
tasdiqlangan.

### Nima UCHUN to'liq avtomatik emas

Railway xizmatlari git manba bilan ulanmagan (bo'lim 25) — bu ATAYLAB:
avtomatik deploy HAR PUSH'da ishga tushishi mumkin edi, lekin bu
`develop`ga to'g'ridan-to'g'ri push qilish (butun shu muhandislik
davomida qo'llanilgan amaliyot) HAR DOIM production'ni o'zgartirishini
anglatardi — operator buni ATAYLAB xohlamasligi mumkin (masalan bir nechta
kichik commit'ni birlashtirib, BITTA deploy qilish). Tavsiya (bo'lim 25'da
ham yozilgan) — `railway service source connect --repo ... --branch main`
— ANIQ shu MUAMMONI hal qiladi (faqat `main`ga merge bo'lganda deploy,
`develop`ga oddiy push'da EMAS) va HAR DOIM aniq mos kelishni kafolatlaydi,
lekin bu ARXITEKTURA qarori — operator tasdig'isiz yoqilmadi.

<!-- qa-throwaway: docs-only -->
