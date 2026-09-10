#!/bin/sh
# A4 — docker-compose postgres BIRINCHI init'ida `bobododa_migrator` va
# `bobododa_app` rollarini yaratadi (bo'sh data-dir; qayta ishga tushirishda
# o'tkazib yuboriladi — reset uchun `docker compose down -v`).
#
# Parollar docker-compose'dagi URL'lar bilan mos (bobododa_app:app /
# bobododa_migrator:migrator). Prod'da bu skript ISHLATILMAYDI — u yerda
# provisioning `prisma/sql/roles.sql` ni haqiqiy sirlar bilan chaqiradi.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	DO \$\$
	BEGIN
	  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bobododa_migrator') THEN
	    CREATE ROLE bobododa_migrator LOGIN PASSWORD 'migrator';
	  END IF;
	  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bobododa_app') THEN
	    CREATE ROLE bobododa_app LOGIN PASSWORD 'app';
	  END IF;
	END
	\$\$;

	GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO bobododa_migrator, bobododa_app;
	GRANT CREATE ON DATABASE "$POSTGRES_DB" TO bobododa_migrator;
	GRANT CREATE, USAGE ON SCHEMA public TO bobododa_migrator;
	GRANT USAGE ON SCHEMA public TO bobododa_app;
	ALTER DEFAULT PRIVILEGES FOR ROLE bobododa_migrator IN SCHEMA public
	  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bobododa_app;
	ALTER DEFAULT PRIVILEGES FOR ROLE bobododa_migrator IN SCHEMA public
	  GRANT USAGE, SELECT ON SEQUENCES TO bobododa_app;
EOSQL

echo "A4: bobododa_migrator + bobododa_app rollari tayyor"
