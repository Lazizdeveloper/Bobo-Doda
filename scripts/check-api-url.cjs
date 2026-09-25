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
    // ── Standart (isRealDeploy=false) — lokal dev / CI / Vercel landing ──
    { name: "bo'sh/berilmagan (Vercel landing, CI, lokal dev)", value: undefined, options: {}, shouldThrow: false },
    { name: "to'g'ri production qiymat", value: "https://api.bobododa.uz/api/v1", options: {}, shouldThrow: false },
    {
      name: "trailing slash bilan to'g'ri qiymat",
      value: "https://api.bobododa.uz/api/v1/",
      options: {},
      shouldThrow: false,
    },
    {
      name: "REGRESSIYA — lokal dev (.env.local): localhost + isRealDeploy=false RAD ETILMASLIGI SHART " +
        "(ilgari bu funksiya muhitdan qat'i nazar rad etardi — `npm run dev` shu sabab ISHLAMAY QOLGANI aniqlangan)",
      value: "http://localhost:4000/api/v1",
      options: {},
      shouldThrow: false,
    },
    {
      name: "127.0.0.1 + isRealDeploy=false — xuddi shu regressiya, ham rad etilmasligi shart",
      value: "http://127.0.0.1:4000/api/v1",
      options: {},
      shouldThrow: false,
    },
    {
      name: "prefikssiz xom origin, isRealDeploy=false bo'lsa ham — /api/v1 talabi HAR DOIM ishlaydi",
      value: "https://api.bobododa.uz",
      options: {},
      shouldThrow: true,
    },
    { name: "yaroqsiz URL (parse xatosi)", value: "not a url at all", options: {}, shouldThrow: true },
    {
      name: "REGRESSIYA (security-engineer topilmasi) — query-string orqali /api/v1 'aldash' RAD ETILISHI SHART " +
        "(pathname'da prefiks yo'q, faqat ?next=... ichida)",
      value: "https://api.bobododa.uz/?next=/api/v1",
      options: {},
      shouldThrow: true,
    },
    {
      name: "REGRESSIYA (security-engineer topilmasi) — fragment orqali /api/v1 'aldash' RAD ETILISHI SHART",
      value: "https://api.bobododa.uz/#/api/v1",
      options: {},
      shouldThrow: true,
    },

    // ── isRealDeploy=true — Railway asosiy ilova / Vercel landing ──
    {
      name: "to'g'ri production qiymat, isRealDeploy=true",
      value: "https://api.bobododa.uz/api/v1",
      options: { isRealDeploy: true },
      shouldThrow: false,
    },
    {
      name: "localhost — isRealDeploy=true bo'lsa RAD ETILISHI SHART",
      value: "http://localhost:4000/api/v1",
      options: { isRealDeploy: true },
      shouldThrow: true,
    },
    {
      name: "127.0.0.1 — isRealDeploy=true bo'lsa RAD ETILISHI SHART",
      value: "http://127.0.0.1:4000/api/v1",
      options: { isRealDeploy: true },
      shouldThrow: true,
    },
    {
      name: "http (https emas) haqiqiy domen, isRealDeploy=true — rad etilishi SHART",
      value: "http://api.bobododa.uz/api/v1",
      options: { isRealDeploy: true },
      shouldThrow: true,
    },
    {
      name: "prefikssiz xom origin — 2026-09-20 insidentining aynan o'zi",
      value: "https://api.bobododa.uz",
      options: { isRealDeploy: true },
      shouldThrow: true,
    },
    {
      name: "eski xom Railway domeni, prefikssiz",
      value: "https://backend-production-52385.up.railway.app",
      options: { isRealDeploy: true },
      shouldThrow: true,
    },

    // ── requireForApp — Railway "frontend" xizmati ──
    {
      name: "REGRESSIYA — requireForApp=true bo'lsa bo'sh/berilmagan qiymat RAD ETILISHI SHART " +
        "(bo'sh qoldirish — API_BASE=\"\" — xuddi shu insident sinfi: prefikssiz, o'zi-o'ziga so'rov)",
      value: undefined,
      options: { requireForApp: true, isRealDeploy: true },
      shouldThrow: true,
    },
    {
      name: "requireForApp=true, lekin qiymat to'g'ri berilgan — o'tishi shart",
      value: "https://api.bobododa.uz/api/v1",
      options: { requireForApp: true, isRealDeploy: true },
      shouldThrow: false,
    },
    {
      name: "requireForApp=false (masalan Vercel landing) — bo'sh qiymat baribir o'tadi",
      value: undefined,
      options: { requireForApp: false, isRealDeploy: true },
      shouldThrow: false,
    },
  ];

  const failures = [];
  for (const c of cases) {
    let threw = false;
    try {
      assertApiUrlSane(c.value, c.options);
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
