#!/bin/sh
# A4/T1 — docker-compose postgres BIRINCHI init'ida `bobododa_migrator` va
# `bobododa_app` (yoki `DB_MIGRATOR_ROLE`/`DB_APP_ROLE` bilan boshqa nom)
# rollarini yaratadi (bo'sh data-dir; qayta ishga tushirishda o'tkazib
# yuboriladi — reset uchun `docker compose down -v`).
#
# YAGONA MANBA — `prisma/sql/roles.sql` (`../../prisma/sql/roles.sql:ro`
# sifatida mount qilingan, `docker-compose.yml`ga qarang). Bu skript faqat
# uni psql -v bilan chaqiradi — SQL ikki joyda mustaqil yozilmagan.
#
# Parollar docker-compose'dagi URL'lar bilan mos (bobododa_app:app /
# bobododa_migrator:migrator). Prod'da bu skript ISHLATILMAYDI — u yerda
# provisioning `prisma/sql/roles.sql` ni haqiqiy sirlar bilan chaqiradi.
set -e

ROLES_SQL="/docker-entrypoint-initdb.d/sql/roles.sql"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_role="${DB_APP_ROLE:-bobododa_app}" \
  -v migrator_role="${DB_MIGRATOR_ROLE:-bobododa_migrator}" \
  -v app_pw="${DB_APP_PASSWORD:-app}" \
  -v migrator_pw="${DB_MIGRATOR_PASSWORD:-migrator}" \
  -v db_name="$POSTGRES_DB" \
  -f "$ROLES_SQL"

echo "A4/T1: ${DB_MIGRATOR_ROLE:-bobododa_migrator} + ${DB_APP_ROLE:-bobododa_app} rollari tayyor"
