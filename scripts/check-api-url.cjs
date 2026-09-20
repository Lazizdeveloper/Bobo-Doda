/**
 * `NEXT_PUBLIC_API_URL` sog'lik tekshiruvining (`api-url.config.mjs`)
 * o'zini sinaydi — 2026-09-20'dagi real production insidentning
 * regressiya testi (bo'lim 25): domen cutover'da bu qiymat backend'ning
 * global API prefiksi ("/api/v1") SIZ o'rnatilgan edi, natijada HAR bir
 * haqiqiy so'rov (ro'yxatdan o'tish, login, staff kirish) 404 bilan
 * yiqilgan edi, sahifa qobig'i esa 200 bilan yuklanardi.
 *
 * `npm run verify` ichida yuradi.
 */
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..");

async function main() {
  const { assertApiUrlSane } = await import(
    pathToFileURL(path.join(ROOT, "api-url.config.mjs")).href
  );

  const cases = [
    { name: "bo'sh/berilmagan (Vercel landing, CI, lokal dev)", value: undefined, shouldThrow: false },
    { name: "to'g'ri production qiymat", value: "https://api.bobododa.uz/api/v1", shouldThrow: false },
    { name: "trailing slash bilan to'g'ri qiymat", value: "https://api.bobododa.uz/api/v1/", shouldThrow: false },
    { name: "localhost — rad etilishi SHART", value: "http://localhost:4000/api/v1", shouldThrow: true },
    { name: "127.0.0.1 — rad etilishi SHART", value: "http://127.0.0.1:4000/api/v1", shouldThrow: true },
    {
      name: "prefikssiz xom origin — 2026-09-20 insidentining aynan o'zi",
      value: "https://api.bobododa.uz",
      shouldThrow: true,
    },
    {
      name: "eski xom Railway domeni, prefikssiz",
      value: "https://backend-production-52385.up.railway.app",
      shouldThrow: true,
    },
  ];

  const failures = [];
  for (const c of cases) {
    let threw = false;
    try {
      assertApiUrlSane(c.value);
    } catch {
      threw = true;
    }
    if (threw !== c.shouldThrow) {
      failures.push(`"${c.name}" — kutilgan throw=${c.shouldThrow}, haqiqiy=${threw}`);
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, check: "api-url", failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, check: "api-url", casesChecked: cases.length }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
