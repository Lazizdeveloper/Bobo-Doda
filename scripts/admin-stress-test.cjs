/**
 * Admin panel smoke/crawl suite.
 *
 * DIQQAT: bu fayl qayta yozildi. Eski varianti mavjud BO'LMAGAN marshrutlarni
 * ("/admin/monitoring", "/admin/incidentlar", "/admin/kontent",
 * "/admin/super/tizim") tekshirardi va oddiy adminni "/admin/audit" dan
 * bloklanadi deb hisoblardi — holbuki `seedAdmins` da operator adminda
 * `audit` huquqi BOR. Ya'ni suite hech qachon o'ta olmasdi va shu sababli
 * admin panel amalda avtomatik tekshiruvsiz qolgan edi.
 *
 * YANA HAM ESKIRGAN (Bosqich 17dan beri) — real `lib/api/admin.ts` mock
 * `sb2_admin_session`ni emas, `bd_staff_session` + real email+parol(+TOTP)
 * login oqimini kutadi. O'rnini bosuvchi: `npm run test:e2e:live`
 * (`tests/e2e/admin.spec.ts`, staff credential berilsa) — RUNBOOK §14.
 */
const { chromium } = require("playwright");

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";

/** Operator admin (`admin@bobododa.uz`) huquqi yetadigan barcha marshrutlar */
const OPERATOR_ROUTES = [
  "/admin",
  "/admin/foydalanuvchilar",
  "/admin/xizmatlar",
  "/admin/loyihalar",
  "/admin/shartnomalar",
  "/admin/verifikatsiya",
  "/admin/nizolar",
  "/admin/shikoyatlar",
  "/admin/apellyatsiyalar",
  "/admin/sharhlar",
  "/admin/tolovlar",
  "/admin/yordam",
  "/admin/kategoriyalar",
  "/admin/audit",
];

/** Faqat super admin ochadigan marshrutlar */
const SUPER_ONLY_ROUTES = ["/admin/sozlamalar", "/admin/super/adminlar"];

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
  assert(
    (await page.locator("body").innerText()).trim().length > 50,
    `${route}: blank page`
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1
  );
  assert(!overflow, `${route}: horizontal overflow`);
  const unlabeled = await page.locator("button").evaluateAll((buttons) =>
    buttons.filter(
      (button) =>
        !(
          button.innerText.trim() ||
          button.getAttribute("aria-label") ||
          button.getAttribute("title")
        )
    ).length
  );
  assert(unlabeled === 0, `${route}: ${unlabeled} unlabeled buttons`);
  assert(errors.length === 0, `${route}: ${errors.join(" | ")}`);
  page.off("pageerror", onError);
}

let browser;
(async () => {
  browser = await chromium.launch({
    headless: true,
    /* Konteyner/CI muhitida (Docker, GitHub Actions) Chromium'ning user
       namespace sandbox'i mavjud emas va sahifa "Page crashed" bilan
       yiqiladi; /dev/shm ham ko'pincha kichik. Bu ikki bayroqsiz suite
       lokalda ishlab, CI'da ishlamaydi. */
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  /* --- Operator admin: ruxsat etilgan sahifalar ochilishi kerak --- */
  const adminContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "admin@bobododa.uz", "Adminsecure2026");
  for (const route of OPERATOR_ROUTES) await auditPage(adminPage, route);

  /* --- Operator admin: super-admin marshrutlari YOPIQ --- */
  for (const route of SUPER_ONLY_ROUTES) {
    await adminPage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await adminPage.waitForURL("**/admin/ruxsat-yoq");
    assert(
      (await adminPage.locator("body").innerText()).includes("403"),
      `ordinary admin reached ${route}`
    );
  }
  await adminContext.close();

  /* --- Super admin: hamma narsa ochiq, mobil kenglikda ham --- */
  const ceoContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
  });
  const ceoPage = await ceoContext.newPage();
  await login(ceoPage, "ceo@bobododa.uz", "CEOsecure2026", "super_admin");
  for (const route of [...OPERATOR_ROUTES, ...SUPER_ONLY_ROUTES]) {
    await auditPage(ceoPage, route);
  }
  await ceoContext.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: {
          operatorRoutes: OPERATOR_ROUTES.length,
          superRoutes: SUPER_ONLY_ROUTES.length,
          ordinaryAdminBlockedFromSuperRoutes: SUPER_ONLY_ROUTES.length,
          desktopAndMobile: true,
          overflowAndAccessibility: true,
        },
      },
      null,
      2
    )
  );
})()
  .catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
