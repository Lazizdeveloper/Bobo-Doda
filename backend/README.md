# Bobo&Doda — Backend

Markaziy Osiyo freelance marketplace backend. **NestJS 11 modular monolith**,
PostgreSQL 16 + Prisma 6, Redis 7 + BullMQ. Frontend'ning `lib/api` chegarasini
qoplaydi (`../lib/api`).

- Arxitektura qarorlari: [`../docs/02-decisions.md`](../docs/02-decisions.md)
- API yuzasi: [`../docs/00-api-surface.md`](../docs/00-api-surface.md)
- Ma'lumot modeli: [`../docs/01-data-model.md`](../docs/01-data-model.md)

## Bosqich 1 — Poydevor (joriy)

Kiritilgan: NestJS skeleton, Prisma schema (identity + auth token infra +
audit/outbox/idempotency), Zod env validatsiyasi, global ValidationPipe /
ExceptionFilter / LoggingInterceptor / requestId, health check, Swagger,
Docker Compose (postgres/redis/minio), CI.

Domen modullari (`auth`, `catalog`, `contracts`, `ledger`, `disputes`,
`admin`) keyingi bosqichlarda.

## Ishga tushirish

> **NixOS'da:** avval `nix-shell` (Prisma engine'lari `linux-nixos` uchun
> yuklab olinmaydi — `shell.nix` ularni nixpkgs'dan beradi). Boshqa
> distributsiyalarda / Docker / CI'da kerak emas.

```bash
cp .env.example .env
# NixOS: nix-shell        # keyin ↓ shu shell ichida
npm install                 # postinstall: prisma generate

# Variant A — hammasi Docker'da (Bosqich 1 DoD):
docker compose up           # postgres + redis + minio + migrate + api
#   → http://localhost:4000/health/ready  → 200
#   → http://localhost:4000/docs          → Swagger UI

# Variant B — faqat infratuzilma Docker'da, app lokal:
npm run infra:up            # postgres + redis + minio
npm run prisma:migrate      # birinchi migratsiya
npm run start:dev
```

## Skriptlar

| Skript | Vazifa |
|---|---|
| `npm run start:dev` | Watch rejimida |
| `npm run build` | `nest build` → `dist/` |
| `npm run typecheck` | `tsc --noEmit` (strict + noUncheckedIndexedAccess) |
| `npm run lint` | ESLint (typescript-eslint, type-checked) |
| `npm test` | **Unit** testlar (tez, konteynersiz) |
| `npm run test:e2e` | **Integration** — Testcontainers (real Postgres+Redis), Docker kerak |
| `npm run test:cov` | Unit + coverage |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:migrate:deploy` | `prisma migrate deploy` (CI/prod) |
| `npm run prisma:studio` | Prisma Studio |

## Papka tuzilishi

```
src/
  main.ts                  bootstrap: helmet, prefix api/v1, ValidationPipe, Swagger
  app.module.ts            ildiz modul + global filter/interceptor/middleware
  config/                  Zod env sxemasi + tiplashtirilgan AppConfigService
  common/
    errors/                DomainError + taksonomiya (frontend errors.ts shartnomasi)
    http/                  AllExceptionsFilter, LoggingInterceptor, RequestIdMiddleware, ValidationPipe
  infra/
    prisma/  redis/  queue/  logger/
  modules/
    health/                /health/live, /health/ready
prisma/
  schema.prisma            enum'lar UPPER_SNAKE (ADR-02); pul BigInt tiyin (ADR-01, Bosqich 4)
  migrations/
test/
  health.e2e-spec.ts       Bosqich 1 DoD'ni avtomatlashtiradi
```

## Bosqich 1 tekshiruv holati

| Tekshiruv | Holat | Izoh |
|---|---|---|
| `npm run typecheck` | ✅ | strict + noUncheckedIndexedAccess |
| `npm run lint` | ✅ | typescript-eslint type-checked |
| `npm test` (unit) | ✅ | 28 test / 3 suite (env sxemasi, xato taksonomiyasi, exception filter) |
| `npm run build` | ✅ | `dist/main.js` |
| `prisma migrate` (init) | ✅ | `prisma/migrations/2026…_init` real Postgres 16 ga qo'llandi |
| `npm run test:e2e` | ⏳ CI | Testcontainers — Docker kerak; CI (`backend-ci.yml`) da ishlaydi |
| `docker compose up` | ⏳ CI/lokal | Docker daemon kerak; `api` xizmati `/health/ready` healthcheck'i bilan |

## Muhim qoidalar (`docs/02-decisions.md`)

- **Pul:** DB/ledger `BigInt` tiyin, DTO butun so'm. Ledger'ga faqat
  `amount % 100 === 0` yoziladi. Yaxlitlash — floor, qoldiq `PLATFORM_REVENUE`.
- **Enum'lar:** inglizcha `UPPER_SNAKE` hamma joyda. Frontend o'zbekchaga
  `lib/api/wire-enums.ts` da o'giradi.
- **Xatolar:** `DomainError` klassi — `throw new Error('...')` YOZILMAYDI.
  Filtr `{ code, message?, fieldErrors?, requestId }` beradi.
- **Prisma:** faqat repository qatlamida. Migratsiya faqat `prisma migrate`.
- **Config:** `process.env` hech qayerda to'g'ridan-to'g'ri o'qilmaydi —
  faqat `AppConfigService`.
