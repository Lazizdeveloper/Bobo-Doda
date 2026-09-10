#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# A4 isboti — DOCKER'SIZ. Throwaway lokal Postgres klasteri ko'taradi,
# `bobododa_migrator` bilan `prisma migrate deploy` qiladi, so'ng
# `bobododa_app` bilan taqiqlangan amallarni sinaydi va HAQIQIY
# "permission denied" chiqishini ko'rsatadi.
#
#   nix-shell backend/shell.nix --run 'bash backend/scripts/prove-append-only.sh'
#
# CI'da ekvivalent — `test/db-roles.e2e-spec.ts` (Testcontainers).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="$(mktemp -d "${TMPDIR:-/tmp}/bd-pg-XXXXXX")"
PGPORT="${PGPORT:-55432}"
PGHOST=127.0.0.1
SU=bobododa

cleanup() {
  pg_ctl -D "$PGDATA" -m immediate -w stop >/dev/null 2>&1 || true
  rm -rf "$PGDATA"
}
trap cleanup EXIT

echo "▶ initdb ($PGDATA)"
initdb -U "$SU" --auth=trust --encoding=UTF8 -D "$PGDATA" >/dev/null

echo "▶ postgres start (:$PGPORT, TZ=UTC)"
pg_ctl -D "$PGDATA" -w -o "-p $PGPORT -k '' -c listen_addresses=$PGHOST -c timezone=UTC" start >/dev/null

psql_su() { psql -X -q -h "$PGHOST" -p "$PGPORT" -U "$SU" -v ON_ERROR_STOP=1 "$@"; }

echo "▶ create database + rollar (bobododa_migrator / bobododa_app)"
psql_su -d postgres -c "CREATE DATABASE bobododa;"
psql_su -d bobododa <<'SQL'
CREATE ROLE bobododa_migrator LOGIN PASSWORD 'migrator';
CREATE ROLE bobododa_app      LOGIN PASSWORD 'app';
GRANT CONNECT ON DATABASE bobododa TO bobododa_migrator, bobododa_app;
-- Trusted kengaytma (`pg_trgm` va h.k.) DB ustidan CREATE talab qiladi.
GRANT CREATE ON DATABASE bobododa TO bobododa_migrator;
GRANT CREATE, USAGE ON SCHEMA public TO bobododa_migrator;
GRANT USAGE  ON SCHEMA public TO bobododa_app;
ALTER DEFAULT PRIVILEGES FOR ROLE bobododa_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bobododa_app;
SQL

MIGRATOR_URL="postgresql://bobododa_migrator:migrator@$PGHOST:$PGPORT/bobododa?schema=public"
APP_URL="postgresql://bobododa_app:app@$PGHOST:$PGPORT/bobododa?schema=public"

echo "▶ prisma migrate deploy  (bobododa_migrator / directUrl)"
( cd "$BACKEND_DIR" && DATABASE_URL="$APP_URL" DATABASE_MIGRATION_URL="$MIGRATOR_URL" \
    npx --no-install prisma migrate deploy )

echo
echo "▶ kengaytmalar (A2):"
psql_su -d bobododa -c "SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm','unaccent','citext','btree_gin') ORDER BY 1;"

# ── App roli bilan sinovlar ────────────────────────────────────────────────
psql_app() { psql -X -q -h "$PGHOST" -p "$PGPORT" -U bobododa_app -d bobododa "$@"; }
fails=0
expect_ok()   { if psql_app -v ON_ERROR_STOP=1 -c "$1" >/dev/null 2>&1; then echo "  ✅ RUXSAT: $2"; else echo "  ❌ KUTILMAGAN RAD: $2"; fails=$((fails+1)); fi; }
expect_deny() {
  local out; out="$(psql_app -c "$1" 2>&1 || true)"
  if grep -qi 'permission denied' <<<"$out"; then
    echo "  ✅ RAD ETILDI: $2"
    echo "       $(grep -i 'permission denied' <<<"$out" | head -1 | sed 's/^psql:[^ ]* //;s/^ERROR:  //')"
  else
    echo "  ❌ KUTILGAN RAD BO'LMADI: $2"; echo "     $out"; fails=$((fails+1))
  fi
}

echo
echo "▶ bobododa_app amallari:"
expect_ok   "INSERT INTO audit_logs (id,\"actorType\",\"actorName\",action,\"resourceType\",\"resourceId\") VALUES (gen_random_uuid(),'SYSTEM','proof','A4','t','1')" "audit_logs INSERT"
expect_deny "UPDATE audit_logs SET action='TAMPERED'"                       "audit_logs UPDATE"
expect_deny "DELETE FROM audit_logs"                                        "audit_logs DELETE"
expect_ok   "INSERT INTO outbox_events (id,\"aggregateType\",\"aggregateId\",\"eventType\",payload) VALUES (gen_random_uuid(),'T','1','t.created','{}'::jsonb)" "outbox_events INSERT"
expect_ok   "UPDATE outbox_events SET status='PROCESSING', attempts=1"      "outbox_events UPDATE(status,attempts) — worker"
expect_deny "UPDATE outbox_events SET payload='{\"x\":1}'::jsonb"           "outbox_events UPDATE(payload)"
expect_deny "DELETE FROM outbox_events"                                     "outbox_events DELETE"
expect_ok   "INSERT INTO users (id,phone,\"passwordHash\",\"fullName\",\"updatedAt\") VALUES (gen_random_uuid(),'+998900000001','h','T',now())" "users INSERT (oddiy jadval)"
expect_ok   "UPDATE users SET \"fullName\"='T2' WHERE phone='+998900000001'" "users UPDATE (oddiy jadval)"
expect_ok   "DELETE FROM users WHERE phone='+998900000001'"                 "users DELETE (oddiy jadval)"

echo
if [ "$fails" -eq 0 ]; then echo "✅ A4 ISBOTLANDI — append-only DB darajasida majburlangan."; exit 0
else echo "❌ A4 — $fails ta kutilmagan natija."; exit 1; fi
