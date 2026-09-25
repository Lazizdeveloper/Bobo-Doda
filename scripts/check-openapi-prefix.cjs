/**
 * `packages/contracts/openapi.json`dagi HAR BIR yo'l `/api/v1` bilan
 * boshlanishini tekshiradi (health tekshiruvlari bundan mustasno).
 *
 * Bo'lim 25 cross-review topilmasi (qa-engineer): kontraktlar drift
 * gate'i (`.github/workflows/backend-ci.yml`) faqat "emitter hujjati
 * committed holat bilan bir xilmi" tekshiradi — agar kimdir kelajakda
 * `backend/scripts/emit-openapi.ts`dan `setGlobalPrefix` chaqiruvini olib
 * tashlasa VA android committed faylni "generate:contracts" natijasi bilan
 * qayta yozib commit qilsa, drift gate BUZILGAN holatni ham "to'g'ri" deb
 * qabul qilardi (chunki ikkalasi — committed va qayta generatsiya
 * qilingan — birdek prefikssiz bo'lardi). Bu skript kontraktning O'ZINI,
 * emitter bilan solishtirmasdan, mustaqil tekshiradi — shuning uchun
 * `emit-openapi.ts`ning o'zi qanday buzilishidan qat'i nazar ushlaydi.
 *
 * `npm run verify`da ishlaydi.
 */
const path = require("path");
const { readFileSync } = require("fs");

const OPENAPI_PATH = path.join(__dirname, "..", "packages", "contracts", "openapi.json");
const REQUIRED_PREFIX = "/api/v1";
const EXEMPT_PATHS = new Set(["/health/live", "/health/ready"]);

function main() {
  const doc = JSON.parse(readFileSync(OPENAPI_PATH, "utf8"));
  const paths = Object.keys(doc.paths ?? {});

  if (paths.length === 0) {
    console.error(JSON.stringify({ ok: false, check: "openapi-prefix", error: "openapi.json'da paths topilmadi" }));
    process.exit(1);
  }

  const offenders = paths.filter((p) => !EXEMPT_PATHS.has(p) && !p.startsWith(REQUIRED_PREFIX));

  if (offenders.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          check: "openapi-prefix",
          error: `packages/contracts/openapi.json'da "${REQUIRED_PREFIX}" prefiksisiz yo'l(lar) bor — backend/src/main.ts (setGlobalPrefix) bilan mos emas`,
          offenders,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify({ ok: true, check: "openapi-prefix", pathsChecked: paths.length, exempt: [...EXEMPT_PATHS] }),
  );
}

main();
