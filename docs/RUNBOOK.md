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

### Rollarni yaratish (bir marta, superuser)

- **docker-compose:** `backend/docker/initdb/10-roles.sh` — postgres
  konteynerining BIRINCHI init'ida avtomatik (bo'sh data-dir).
  Reset: `docker compose down -v`.
- **CI / prod / test:** `backend/prisma/sql/roles.sql`
  (`psql -v app_pw=… -v migrator_pw=… -v db_name=bobododa -f prisma/sql/roles.sql`).
- **Integration test:** `test/db-roles.e2e-spec.ts` superuser bilan yaratadi.

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
  -f backend/prisma/sql/roles.sql
# Parollarni xavfsiz joyga yozib qo'ying (secret manager) — bu skript
# ularni faqat o'sha ishga tushirishda ko'rsatadi.

# 2. Migratsiya — MIGRATOR bilan (kengaytma + GRANT/REVOKE shu yerda ishlaydi):
DATABASE_URL="postgresql://bobododa_app:<app_pw>@<host>:5432/bobododa?schema=public" \
DATABASE_MIGRATION_URL="postgresql://bobododa_migrator:<migrator_pw>@<host>:5432/bobododa?schema=public" \
  npx prisma migrate deploy

# 3. Runtime .env / secret'da DATABASE_URL — FAQAT bobododa_app bilan.
#    DATABASE_URL ga bobododa_migrator qo'ymang — F1 boot'da rad etadi.
```

Ba'zi managed provayderlar (masalan Cloud SQL, RDS) standart `postgres`
superuser'ini bermaydi — o'rniga `rds_superuser` kabi teng huquqli rol beriladi.
`roles.sql` faqat `CREATE ROLE`, `GRANT`, `ALTER DEFAULT PRIVILEGES`
ishlatadi — bu rollarda odatda yetarli (superuser SHART emas).

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
xato bilan).

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
