const { chromium } = require("playwright");

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const routes = [
  "/admin",
  "/admin/monitoring",
  "/admin/incidentlar",
  "/admin/foydalanuvchilar",
  "/admin/verifikatsiya",
  "/admin/nizolar",
  "/admin/tolovlar",
  "/admin/yordam",
  "/admin/kontent",
];

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function login(page, email, password, role = "admin") {
  const path = role === "super_admin" ? "/rahbariyat/kirish" : "/admin/kirish";
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.getByLabel("Korporativ email").fill(email);
  await page.getByLabel("Parol").fill(password);
  await page.getByRole("button", { name: "Xavfsiz kirish" }).click();
  await page.waitForURL("**/admin");
}

async function auditPage(page, route) {
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on("pageerror", onError);
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  assert(page.url().includes(route), `${route}: unexpected redirect ${page.url()}`);
  assert((await page.locator("body").innerText()).trim().length > 50, `${route}: blank page`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert(!overflow, `${route}: horizontal overflow`);
  const unlabeled = await page.locator("button").evaluateAll((buttons) =>
    buttons.filter((button) => !(button.innerText.trim() || button.getAttribute("aria-label") || button.getAttribute("title"))).length
  );
  assert(unlabeled === 0, `${route}: ${unlabeled} unlabeled buttons`);
  assert(errors.length === 0, `${route}: ${errors.join(" | ")}`);
  page.off("pageerror", onError);
}

let browser;
(async () => {
  browser = await chromium.launch({ headless: true });

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "admin@bobododa.uz", "Adminsecure2026");
  for (const route of routes) await auditPage(adminPage, route);
  await adminPage.goto(`${BASE}/admin/super/adminlar`, { waitUntil: "networkidle" });
  await adminPage.waitForURL("**/admin/ruxsat-yoq");
  assert((await adminPage.locator("body").innerText()).includes("403"), "ordinary admin reached CEO route");
  await adminPage.goto(`${BASE}/admin/audit`, { waitUntil: "networkidle" });
  await adminPage.waitForURL("**/admin/ruxsat-yoq");
  assert((await adminPage.locator("body").innerText()).includes("403"), "ordinary admin reached audit route");
  await adminContext.close();

  const ceoContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const ceoPage = await ceoContext.newPage();
  await login(ceoPage, "ceo@bobododa.uz", "CEOsecure2026", "super_admin");
  for (const route of [...routes, "/admin/audit", "/admin/super/adminlar", "/admin/super/tizim"]) {
    await auditPage(ceoPage, route);
  }
  await ceoContext.close();

  console.log(JSON.stringify({
    ok: true,
    checks: {
      adminRoutes: routes.length,
      ceoRoutes: routes.length + 3,
      ordinaryAdminBlockedFromSuper: true,
      ordinaryAdminBlockedFromAudit: true,
      desktopAndMobile: true,
      overflowAndAccessibility: true,
    },
  }, null, 2));
})()
  .catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
