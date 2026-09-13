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
