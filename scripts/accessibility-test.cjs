/**
 * ESKIRGAN — Bosqich 17 (real backend integratsiyasi)dan beri BUZILGAN.
 * Sabab va o'rnini bosuvchi — `scripts/lifecycle-test.cjs` boshidagi izohga
 * qarang (`npm run test:e2e:live`, `tests/e2e/`, RUNBOOK §14). Axe a11y
 * tekshiruvi o'zi hali qimmatli — real sahifalarga `tests/e2e/` orqali
 * (haqiqiy login bilan) qayta ulash keyingi bosqich uchun qoldirilgan.
 */
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const routes = [
  ["/xaridor", { userId: "u-b2", role: "xaridor", profileDone: false, verified: true }],
  ["/xaridor/bozor", { userId: "u-b2", role: "xaridor", profileDone: false, verified: true }],
  ["/xaridor/elonlarim", { userId: "u-b2", role: "xaridor", profileDone: false, verified: true }],
  ["/xaridor/shartnomalar", { userId: "u-b2", role: "xaridor", profileDone: false, verified: true }],
  ["/mutaxassis", { userId: "u-1", role: "mutaxassis", profileDone: true, verified: true }],
  ["/mutaxassis/ish-elonlari", { userId: "u-1", role: "mutaxassis", profileDone: true, verified: true }],
  ["/mutaxassis/shartnomalar", { userId: "u-1", role: "mutaxassis", profileDone: true, verified: true }],
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    /* Konteyner/CI muhitida (Docker, GitHub Actions) Chromium'ning user
       namespace sandbox'i mavjud emas va sahifa "Page crashed" bilan
       yiqiladi; /dev/shm ham ko'pincha kichik. Bu ikki bayroqsiz suite
       lokalda ishlab, CI'da ishlamaydi. */
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [];

  for (const [route, session] of routes) {
    await page.goto(`${BASE}/kirish`, { waitUntil: "domcontentloaded" });
    await page.evaluate((value) => localStorage.setItem("sb_session", JSON.stringify(value)), session);
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    for (const violation of result.violations) {
      failures.push({
        route,
        rule: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
        targets: violation.nodes.slice(0, 3).map((node) => node.target),
        summaries: violation.nodes.slice(0, 3).map((node) => node.failureSummary),
      });
    }
  }

  await browser.close();
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, routes: routes.map(([route]) => route) }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
