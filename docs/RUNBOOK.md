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
