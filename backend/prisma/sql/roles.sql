-- ─────────────────────────────────────────────────────────────────────────────
-- A4 — DB rollarini bootstrap qiladi. BIR MARTA, superuser bilan ishlatiladi
-- (docker init / CI / integration-test setup / prod provisioning). Prisma
-- migratsiyalari EMAS — rollar klaster-global, migratsiya esa DB-lokal.
--
--   psql "$SUPERUSER_URL" \
--     -v app_pw="$DB_APP_PASSWORD" \
--     -v migrator_pw="$DB_MIGRATOR_PASSWORD" \
--     -v db_name=bobododa \
--     -f prisma/sql/roles.sql
--
-- Keyin: `DATABASE_MIGRATION_URL=<migrator> prisma migrate deploy` — u
-- kengaytmalar va GRANT/REVOKE ni qo'llaydi (init migratsiya ichida).
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bobododa_migrator') THEN
    EXECUTE format('CREATE ROLE bobododa_migrator LOGIN PASSWORD %L', :'migrator_pw');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bobododa_app') THEN
    EXECUTE format('CREATE ROLE bobododa_app LOGIN PASSWORD %L', :'app_pw');
  END IF;
END
$$;

GRANT CONNECT ON DATABASE :"db_name" TO bobododa_migrator, bobododa_app;

-- Migrator: DDL, CREATE EXTENSION (trusted), GRANT. Superuser EMAS.
-- Trusted kengaytmalar DB ustidan CREATE talab qiladi (schema CREATE emas).
GRANT CREATE ON DATABASE :"db_name" TO bobododa_migrator;
GRANT CREATE, USAGE ON SCHEMA public TO bobododa_migrator;

-- App: schema ko'rinadi; jadval huquqlari migratsiya ichida (GRANT/REVOKE).
GRANT USAGE ON SCHEMA public TO bobododa_app;

-- Migrator yaratgan bo'lajak obyektlar app ga avtomatik ochilsin (migratsiya
-- ichidagi ALTER DEFAULT PRIVILEGES ga qo'shimcha zaxira — migratsiya boshqa
-- ulanishda ishlashi mumkin).
ALTER DEFAULT PRIVILEGES FOR ROLE bobododa_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bobododa_app;
ALTER DEFAULT PRIVILEGES FOR ROLE bobododa_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bobododa_app;
