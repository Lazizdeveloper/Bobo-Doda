#!/usr/bin/env bash
# CI o'zgargan fayllar ro'yxatini (stdin, bitta qatorda bitta yo'l) berilgan
# "scope" (backend|frontend) bo'yicha baholaydi — o'sha scope'ning HAQIQIY
# testini o'tkazib yuborish XAVFSIZmi, deb.
#
#   <o'zgargan fayllar ro'yxati> | bash scripts/ci-changed-scope.sh backend|frontend
#
# stdout: ANIQ "run=true" yoki "run=false" (boshqa hech narsa).
# stderr: har bir fayl uchun bitta qator (tashxis, CI logida ko'rinadi).
#
# FAIL-CLOSED falsafa: bu skript "aniq daxlsiz" yo'llar RO'YXATINI biladi,
# "aniq daxldor" yo'llar ro'yxatini EMAS. Har qanday tanilmagan/yangi yo'l
# — jumladan shu skriptning o'zi, `scripts/check-openapi-prefix.cjs` va
# h.k. — "run=true" (to'liq test) beradi. Aksincha yo'ldan borilsa (faqat
# "daxldor" deb bilingan yo'llar ro'yxati), yangi joyga qo'shilgan haqiqiy
# backend/frontend o'zgarish jimgina sinovdan o'tkazilmay qolishi mumkin
# edi — aynan shu sababdan `check:openapi-prefix` ilgari `backend-ci.yml`
# path filtridan chetda qolib ketgan (release-engineer topilmasi).
set -euo pipefail

scope="${1:-}"

case "$scope" in
  backend)
    # Bu yo'llardagi o'zgarish backend testini talab QILMAYDI.
    IRRELEVANT_RE='^(docs/|app/|components/|lib/|public/|tests/e2e/)|^[^/]+\.md$|^(next\.config\.mjs|csp\.config\.mjs|api-url\.config\.mjs|tailwind\.config\.ts|postcss\.config\.mjs|next-env\.d\.ts|proxy\.ts|netlify\.toml|playwright\.config\.ts)$|^\.github/workflows/(ci|e2e-blocking|uptime-monitor|codeql)\.yml$'
    ;;
  frontend)
    # Amaldagi `ci.yml`dagi paths-ignore bilan AYNAN bir xil — xulq o'zgarmaydi.
    IRRELEVANT_RE='^(backend/|docs/)|^\.github/workflows/backend-ci\.yml$'
    ;;
  *)
    echo "ci-changed-scope.sh: noma'lum scope '$scope' (backend|frontend kutilgan)" >&2
    exit 2
    ;;
esac

files=()
while IFS= read -r line; do
  [ -n "$line" ] && files+=("$line")
done

if [ "${#files[@]}" -eq 0 ]; then
  echo "empty change list -> run=true (fail-closed)" >&2
  echo "run=true"
  exit 0
fi

run=false
for f in "${files[@]}"; do
  if echo "$f" | grep -qE "$IRRELEVANT_RE"; then
    echo "skip-eligible: $f" >&2
  else
    echo "RELEVANT: $f" >&2
    run=true
  fi
done

echo "run=$run"
