#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

OUT="../bobo-doda-deploy.zip"

ITEMS=(
  app
  components
  lib
  public
  netlify.toml
  next.config.mjs
  csp.config.mjs
  package.json
  package-lock.json
  postcss.config.mjs
  tailwind.config.ts
  tsconfig.json
  next-env.d.ts
  eslint.config.mjs
  .env.example
)

for item in "${ITEMS[@]}"; do
  if [ ! -e "$item" ]; then
    echo "XATO: '$item' topilmadi. Zip yasalmadi." >&2
    exit 1
  fi
done

rm -f "$OUT"
zip -r -q "$OUT" "${ITEMS[@]}" \
  -x '*/node_modules/*' '*/.next/*' '*/.next-*/*' '*/.git/*' '*.log' '*/.DS_Store'

echo "Tayyor: $(cd .. && pwd)/bobo-doda-deploy.zip"
echo "Hajmi:  $(du -h "$OUT" | cut -f1)"
