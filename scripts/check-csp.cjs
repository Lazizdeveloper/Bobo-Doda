/**
 * `netlify.toml` dagi CSP `csp.config.mjs` bilan bir xilmi — tekshiradi.
 *
 * Nega kerak: ikkala header ham javobga qo'shiladi va brauzer ularning
 * KESISHMASINI qo'llaydi. Biri `connect-src` ga API originini qo'shsa,
 * ikkinchisi qo'shmasa — natija "qo'shilmagan" bo'ladi va har bir API
 * so'rovi jimgina bloklanadi. Konsolda faqat quruq CSP xatosi chiqadi,
 * kodda esa hech qanday xato yo'q — shuning uchun buni qo'lda topish
 * juda qiyin.
 *
 * `npm run verify` ichida yuradi.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..");

async function main() {
  /* `csp.config.mjs` — ESM, shuning uchun dinamik import.
     `pathToFileURL` ishlatiladi: qo'lda "file://" + yo'l birikmasi
     Windows'da ("C:\...") buzuq URL beradi. */
  const { buildCsp } = await import(
    pathToFileURL(path.join(ROOT, "csp.config.mjs")).href
  );

  /* AYNAN build ishlaydigan muhitdagi qiymat bilan solishtiriladi:
     `buildCsp()` `process.env.NEXT_PUBLIC_API_URL` ni o'zi oladi.

     Shu sababli tekshiruv uch holatni ham to'g'ri hal qiladi:
       • lokal, env yo'q          → ikkalasi ham bazaviy → o'tadi
       • deploy, env bor + toml yangilangan → ikkalasi ham API originli → o'tadi
       • deploy, env bor + toml UNUTILGAN   → farq → build YIQILADI
     Uchinchisi aynan biz ushlamoqchi bo'lgan holat: `next.config.mjs` API'ga
     ruxsat beradi, `netlify.toml` esa yo'q — kesishma natijasida brauzer
     har bir so'rovni bloklaydi va sababi hech qayerda ko'rinmaydi. */
  const expected = buildCsp();

  const toml = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
  const match = toml.match(/Content-Security-Policy\s*=\s*"([^"]+)"/);

  if (!match) {
    console.error(
      "check-csp: netlify.toml ichida Content-Security-Policy topilmadi."
    );
    process.exit(1);
  }

  const actual = match[1].trim();

  if (actual !== expected) {
    console.error("check-csp: netlify.toml CSP csp.config.mjs bilan mos emas.\n");
    console.error("  csp.config.mjs:\n    " + expected + "\n");
    console.error("  netlify.toml:\n    " + actual + "\n");

    /* Farqni direktiva darajasida ko'rsatamiz — butun satrni solishtirish
       o'rniga qaysi direktiva o'zgarganini aytish tezroq tuzatishga olib
       keladi. */
    const split = (s) => new Map(
      s.split(";").map((d) => {
        const t = d.trim();
        const i = t.indexOf(" ");
        return i === -1 ? [t, ""] : [t.slice(0, i), t.slice(i + 1)];
      })
    );
    const e = split(expected);
    const a = split(actual);
    for (const [key, value] of e) {
      if (!a.has(key)) console.error(`  ‑ netlify.toml da yo'q: ${key}`);
      else if (a.get(key) !== value) {
        console.error(
          `  ~ farq qiladi: ${key}\n      kutilgan: ${value}\n      mavjud:   ${a.get(key)}`
        );
      }
    }
    for (const key of a.keys()) {
      if (!e.has(key)) console.error(`  + netlify.toml da ortiqcha: ${key}`);
    }
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, check: "csp in sync" }));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
