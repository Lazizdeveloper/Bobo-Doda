-- ─────────────────────────────────────────────────────────────────────────────
-- A4/T1 — DB rollarini bootstrap qiladi. BIR MARTA, superuser bilan ishlatiladi
-- (docker init / CI / integration-test setup / prod provisioning). Prisma
-- migratsiyalari EMAS — rollar klaster-global, migratsiya esa DB-lokal.
--
--   psql "$SUPERUSER_URL" \
--     -v app_pw="$DB_APP_PASSWORD" \
--     -v migrator_pw="$DB_MIGRATOR_PASSWORD" \
--     -v db_name=bobododa \
--     -v app_role=bobododa_app \
--     -v migrator_role=bobododa_migrator \
--     -f prisma/sql/roles.sql
--
-- `app_role`/`migrator_role` ixtiyoriy — berilmasa sukut nomlar ishlatiladi
-- (T1: ba'zi managed Postgres provayderlari rol nomiga cheklov qo'yadi —
-- prefiks, uzunlik, rezervlangan so'z — shuning uchun bu nom migratsiyaga
-- QATTIQ YOZILMAGAN, DB darajasidagi GUC orqali "uzatiladi", pastda).
--
-- MUHIM — nega bu fayl DO $$ ... $$ BLOKLARIDAN QOCHADI: psql'ning
-- `:'var'`/`:"var"` almashtirishi dollar-quote (`$$...$$`) ICHIDA ISHLAMAYDI
-- (sinab ko'rilgan — `DO $$ BEGIN ... EXECUTE format(..., :'pw') ... END $$;`
-- "syntax error at or near ':'" beradi, chunki `:'pw'` server tomoniga
-- xom holda, almashtirilmasdan yetib boradi). Shuning uchun shart operatorlar
-- (`IF NOT EXISTS ...`) o'rniga `SELECT ... WHERE NOT EXISTS (...) \gexec`
-- naqshi ishlatiladi: bu naqsh dollar-quote'siz, psql VAR ALMASHTIRISHI
-- to'liq ishlaydigan oddiy SQL qatorida qoladi, va shart yolg'on bo'lsa
-- `\gexec` NOL qatorni bajaradi (hech narsa qilmaydi) — DO blok shart emas.
--
-- Keyin: `DATABASE_MIGRATION_URL=<migrator> DATABASE_URL=<app>
--   DB_APP_ROLE=<app_role> prisma migrate deploy` — u kengaytmalar va
-- GRANT/REVOKE'ni <app_role> uchun qo'llaydi (init migratsiya ichida, GUC
-- orqali o'qiydi — migratsiyaning o'zi tahrirlanmaydi).
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on

\if :{?app_role}
\else
  \set app_role bobododa_app
\endif
\if :{?migrator_role}
\else
  \set migrator_role bobododa_migrator
\endif

-- ── Rollar (mavjud bo'lmasagina) ────────────────────────────────────────────
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'migrator_role', :'migrator_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migrator_role')
\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_role', :'app_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role')
\gexec

-- ── Huquqlar ─────────────────────────────────────────────────────────────
SELECT format('GRANT CONNECT ON DATABASE %I TO %I, %I', :'db_name', :'migrator_role', :'app_role') \gexec

-- Migrator: DDL, CREATE EXTENSION (trusted), GRANT. Superuser EMAS.
-- Trusted kengaytmalar DB ustidan CREATE talab qiladi (schema CREATE emas).
SELECT format('GRANT CREATE ON DATABASE %I TO %I', :'db_name', :'migrator_role') \gexec
SELECT format('GRANT CREATE, USAGE ON SCHEMA public TO %I', :'migrator_role') \gexec

-- App: schema ko'rinadi; jadval huquqlari migratsiya ichida (GRANT/REVOKE).
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_role') \gexec

-- Migrator yaratgan bo'lajak obyektlar app ga avtomatik ochilsin (migratsiya
-- ichidagi ALTER DEFAULT PRIVILEGES ga qo'shimcha zaxira — migratsiya boshqa
-- ulanishda ishlashi mumkin).
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'migrator_role', :'app_role'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
  :'migrator_role', :'app_role'
) \gexec

-- ── T1: rol nomini migratsiyaga "uzatish" — DB darajasidagi GUC ────────────
-- Init migratsiya `current_setting('bobododa.app_role', true)` o'qiydi
-- (sukut 'bobododa_app'). Shu bilan migratsiya faylini o'zgartirmasdan
-- boshqa rol nomiga o'tish mumkin — bu bootstrap'ni boshqa nom bilan
-- qayta ishga tushiring, migratsiyaga tegmang.
SELECT format('ALTER DATABASE %I SET bobododa.app_role = %L', :'db_name', :'app_role') \gexec
