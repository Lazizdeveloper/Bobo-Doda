#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Bosqich 18 — Admin E2E uchun TO'LIQ IZOLYATSIYALANGAN stack. Dev/prod
# Postgres (:5432) va Redis (:6379)ga HECH NARSA tegmaydi — o'z throwaway
# klasterini (:55433) va Redis'ini (:6390) ko'taradi, so'ng shu bazaga
# qarshi alohida backend (:4010) va frontend (:3010) instansini ishga
# tushiradi. To'liq tafsilot — RUNBOOK §18.
#
# Ishlatish (repo ildizidan):
#   nix-shell backend/shell.nix --run 'bash backend/scripts/e2e-stack-up.sh'
#
# Keyin (bitta martalik, staff test hisoblari):
#   nix-shell backend/shell.nix --run '
#     DATABASE_URL="postgresql://bobododa_app:app@127.0.0.1:55433/bobododa_e2e?schema=public" \
#     node backend/scripts/e2e-staff-fixture.cjs
#   '
#
# To'xtatish: `bash backend/scripts/e2e-stack-down.sh` (jarayonlarni
# o'ldiradi; PGDATA/Redis papkasini SAQLAB qoladi — qayta ishga tushirish
# tezroq bo'lishi uchun; butunlay tozalash uchun `--purge` bering).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INFRA_DIR="$REPO_ROOT/scratch/e2e-infra"
PGDATA="$INFRA_DIR/pgdata"
PGPORT=55433
REDIS_PORT=6390
BACKEND_PORT=4010
FRONTEND_PORT=3010

mkdir -p "$INFRA_DIR"

echo "▶ [1/6] Postgres (:$PGPORT)"
if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "  allaqachon ishlamoqda — o'tkazib yuborildi"
else
  if [ ! -d "$PGDATA" ]; then
    initdb -U bobododa --auth=trust --encoding=UTF8 -D "$PGDATA" >/dev/null
  fi
  pg_ctl -D "$PGDATA" -w -o "-p $PGPORT -k '' -c listen_addresses=127.0.0.1 -c timezone=UTC" \
    -l "$INFRA_DIR/postgres.log" start >/dev/null
fi

echo "▶ [2/6] bobododa_e2e baza + rollar (mavjud bo'lmasagina)"
psql -h 127.0.0.1 -p "$PGPORT" -U bobododa -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='bobododa_e2e'" | grep -q 1 || \
  psql -h 127.0.0.1 -p "$PGPORT" -U bobododa -d postgres -c "CREATE DATABASE bobododa_e2e;" >/dev/null
psql -h 127.0.0.1 -p "$PGPORT" -U bobododa -d bobododa_e2e \
  -v app_pw=app -v migrator_pw=migrator -v db_name=bobododa_e2e \
  -v app_role=bobododa_app -v migrator_role=bobododa_migrator \
  -f "$REPO_ROOT/backend/prisma/sql/roles.sql" >/dev/null

echo "▶ [3/6] prisma migrate deploy"
( cd "$REPO_ROOT/backend" && \
  DATABASE_URL="postgresql://bobododa_app:app@127.0.0.1:$PGPORT/bobododa_e2e?schema=public" \
  DATABASE_MIGRATION_URL="postgresql://bobododa_migrator:migrator@127.0.0.1:$PGPORT/bobododa_e2e?schema=public" \
  npx --no-install prisma migrate deploy )

echo "▶ [4/6] kamida bitta kategoriya (dizayn)"
psql -h 127.0.0.1 -p "$PGPORT" -U bobododa_app -d bobododa_e2e -tc \
  "SELECT 1 FROM categories LIMIT 1" | grep -q 1 || \
  psql -h 127.0.0.1 -p "$PGPORT" -U bobododa_app -d bobododa_e2e -c "
    INSERT INTO categories (id, slug, \"nameUz\", \"nameRu\", \"nameEn\", status, \"sortOrder\", \"createdAt\", \"updatedAt\")
    VALUES (gen_random_uuid(), 'dizayn', 'Dizayn', 'Дизайн', 'Design', 'ACTIVE', 1, now(), now());
  " >/dev/null

echo "▶ [5/6] Redis (:$REDIS_PORT)"
if redis-cli -p "$REDIS_PORT" ping >/dev/null 2>&1; then
  echo "  allaqachon ishlamoqda — o'tkazib yuborildi"
else
  mkdir -p "$INFRA_DIR/redis-data"
  redis-server --port "$REDIS_PORT" --daemonize yes --dir "$INFRA_DIR/redis-data" \
    --logfile "$INFRA_DIR/redis.log" --save "" --appendonly no
fi

echo "▶ [6/6] backend (:$BACKEND_PORT) + frontend (:$FRONTEND_PORT)"
if [ ! -f "$REPO_ROOT/backend/.env.e2e" ]; then
  echo "  XATO: backend/.env.e2e topilmadi — RUNBOOK §18dagi namunani yarating." >&2
  exit 1
fi
if ! curl -s -o /dev/null "http://localhost:$BACKEND_PORT/health/ready" 2>/dev/null; then
  ( cd "$REPO_ROOT/backend" && set -a && source .env.e2e && set +a && \
    node --enable-source-maps dist/main > "$INFRA_DIR/backend.log" 2>&1 & )
fi
if ! curl -s -o /dev/null "http://localhost:$FRONTEND_PORT/kirish" 2>/dev/null; then
  ( cd "$REPO_ROOT" && \
    NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT/api/v1" NEXT_DIST_DIR=.next-e2e \
    npx next dev -p "$FRONTEND_PORT" > "$INFRA_DIR/frontend.log" 2>&1 & )
fi

echo
echo "Kutilmoqda: backend + frontend health..."
for i in $(seq 1 60); do
  BOK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/health/ready" 2>/dev/null || true)
  FOK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT/kirish" 2>/dev/null || true)
  if [ "$BOK" = "200" ] && [ "$FOK" = "200" ]; then
    echo "✅ Isolated E2E stack tayyor: backend http://localhost:$BACKEND_PORT, frontend http://localhost:$FRONTEND_PORT"
    exit 0
  fi
  sleep 2
done
echo "❌ Timeout — $INFRA_DIR/backend.log va frontend.log ni tekshiring." >&2
exit 1
