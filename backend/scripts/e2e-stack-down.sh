#!/usr/bin/env bash
# Bosqich 18 — isolated admin E2E stack'ni to'xtatadi (e2e-stack-up.sh
# ko'targan Postgres/Redis/backend/frontend). PGDATA/Redis papkasi SUKUT
# BO'YICHA saqlanadi (qayta ishga tushirish tezroq bo'lishi uchun — staff
# fixture va kategoriya qayta yaratilmaydi). Butunlay tozalash uchun:
#   bash backend/scripts/e2e-stack-down.sh --purge
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INFRA_DIR="$REPO_ROOT/scratch/e2e-infra"
PGDATA="$INFRA_DIR/pgdata"

echo "▶ backend (:4010) va frontend (:3010) jarayonlarini to'xtatish"
pkill -f "node --enable-source-maps dist/main" 2>/dev/null && true
# Faqat :3010 portidagi next dev — asosiy dev serverni (:3000) tegmasin
fuser -k 3010/tcp 2>/dev/null || true

echo "▶ Redis (:6390) to'xtatish"
redis-cli -p 6390 shutdown nosave 2>/dev/null || true

echo "▶ Postgres (:55433) to'xtatish"
if [ -d "$PGDATA" ]; then
  pg_ctl -D "$PGDATA" -m fast stop >/dev/null 2>&1 || true
fi

if [ "${1:-}" = "--purge" ]; then
  echo "▶ --purge: $INFRA_DIR butunlay o'chirilmoqda"
  rm -rf "$INFRA_DIR"
  echo "  Keyingi ishga tushirishda e2e-stack-up.sh hammasini noldan yaratadi."
else
  echo "  Ma'lumot saqlandi ($INFRA_DIR) — tezkor qayta ishga tushirish uchun."
fi

echo "✅ To'xtatildi."
