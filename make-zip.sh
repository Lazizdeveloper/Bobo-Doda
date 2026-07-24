#!/usr/bin/env bash
# Netlify uchun TOZA zip tayyorlaydi.
#
# Nega kerak: papkani shunchaki zip qilsa, ichiga node_modules, .next yoki
# loyihaning eski nusxasi tushib qoladi. Aynan shu Netlify build'ini yiqitgan
# edi (papka ichidagi eski nusxa jildi tip tekshiruvida xato bergan).
#
# Ishlatish:  ./make-zip.sh
# Natija:     ../bobo-doda-deploy.zip  — Netlify'ga shuni sudrab tashlang.
#
# MUHIM: fayllar zip ILDIZIDA turadi (tashqi o'ram jild yo'q), shunda Netlify
# netlify.toml ni to'g'ri joydan topadi.

set -euo pipefail
cd "$(dirname "$0")"

OUT="../bobo-doda-deploy.zip"

# Deploy uchun kerak bo'lgan hamma narsa — boshqa hech narsa yuborilmaydi.
ITEMS=(
  app
  components
  lib
  public
  netlify.toml
  next.config.mjs
  package.json
  package-lock.json
  postcss.config.mjs
  tailwind.config.ts
  tsconfig.json
  next-env.d.ts
  .eslintrc.json
)

for item in "${ITEMS[@]}"; do
  if [ ! -e "$item" ]; then
    echo "XATO: '$item' topilmadi. Zip yasalmadi." >&2
    exit 1
  fi
done

# Eski nusxa tekshiruvi — build'ni yiqitgan asosiy sabab shu edi.
for stale in JobBazar jobbazar bobo-doda backup eski; do
  if [ -d "$stale" ]; then
    echo "XATO: '$stale/' jildi topildi — bu loyihaning eski nusxasi." >&2
    echo "      Uni o'chiring yoki loyihadan tashqariga ko'chiring, keyin qayta urining." >&2
    exit 1
  fi
done

rm -f "$OUT"
zip -r -q "$OUT" "${ITEMS[@]}" \
  -x '*/node_modules/*' '*/.next/*' '*/.git/*' '*.log' '*/.DS_Store'

echo "Tayyor: $(cd .. && pwd)/bobo-doda-deploy.zip"
echo "Hajmi:  $(du -h "$OUT" | cut -f1)"
echo
echo "Netlify'ga shu zip faylni sudrab tashlang."
