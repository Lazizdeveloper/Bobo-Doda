const { chromium } = require("playwright");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";

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

let browser;
(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await login(page, "ceo@bobododa.uz", "CEOsecure2026", "super_admin");

  // Portallar role bo'yicha qat'iy ajratilgan.
  await page.evaluate(() => localStorage.removeItem("sb2_admin_session"));
  await page.goto(`${BASE}/admin/kirish`, { waitUntil: "networkidle" });
  await page.getByLabel("Korporativ email").fill("ceo@bobododa.uz");
  await page.getByLabel("Parol").fill("CEOsecure2026");
  await page.getByRole("button", { name: "Xavfsiz kirish" }).click();
  assert(await page.getByRole("alert").isVisible(), "CEO entered through ordinary admin portal");
  await login(page, "ceo@bobododa.uz", "CEOsecure2026", "super_admin");

  // CEO yaratgan yangi admin haqiqatan login qila olishi kerak.
  await page.goto(`${BASE}/admin/super/adminlar`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Admin qo‘shish" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("To‘liq ism").fill("Logic Test Admin");
  await dialog.getByLabel("Korporativ email").fill("logic.admin@bobododa.uz");
  await dialog.getByLabel("Lavozim").fill("Risk operator");
  await dialog.getByLabel("Vaqtinchalik parol").fill("LogicAdmin2026");
  await dialog.getByRole("button", { name: "Yaratish" }).click();
  assert(
    await page.getByText("logic.admin@bobododa.uz").first().isVisible(),
    "created admin missing"
  );

  // CEO tizim sozlamalari validation + persistence.
  await page.goto(`${BASE}/admin/super/tizim`, { waitUntil: "networkidle" });
  const commission = page.getByLabel("Platforma komissiyasi (%)");
  await commission.fill("31");
  await page.getByRole("button", { name: "Sozlamalarni saqlash" }).click();
  assert(await page.getByText("Komissiya 0–30% oralig‘ida bo‘lishi kerak.").isVisible(), "invalid commission accepted");
  await commission.fill("12.5");
  await page.getByLabel("Yangi to‘lovlarni vaqtincha to‘xtatish").check();
  await page.getByRole("button", { name: "Sozlamalarni saqlash" }).click();
  await page.reload({ waitUntil: "networkidle" });
  assert((await commission.inputValue()) === "12.5", "settings did not persist");
  assert(await page.getByLabel("Yangi to‘lovlarni vaqtincha to‘xtatish").isChecked(), "payment pause did not persist");

  // Incident lifecycle: ochish va kamida bir state transition.
  await page.goto(`${BASE}/admin/incidentlar`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Incident ochish" }).click();
  await page.getByRole("dialog").getByLabel("Sarlavha").fill("To‘lov provayderi sekinlashdi");
  await page.getByRole("dialog").getByLabel("Foydalanuvchiga ta’siri").fill("Xaridorlarning ayrim to‘lovlari odatdagidan sekin tasdiqlanmoqda.");
  await page.getByRole("dialog").getByRole("button", { name: "E’lon qilish" }).click();
  await page.getByRole("button", { name: "Holatni yangilash" }).click();
  await page.getByRole("dialog").getByLabel("Bajarilgan ish va natija").fill("Provayder holati va webhook navbati tekshirilmoqda.");
  await page.getByRole("dialog").getByRole("button", { name: "Holatni o‘tkazish" }).click();
  const incidents = await page.evaluate(() => JSON.parse(localStorage.getItem("sb2_admin_incidents") || "[]"));
  assert(incidents[0]?.status === "tekshirilmoqda", "incident transition failed");

  // KYC reject sababini majburiy so‘rashi va qarorni saqlashi kerak.
  await page.evaluate(() => {
    localStorage.setItem("sb2_verifications", JSON.stringify([{
      userId: "u-1", status: "korib_chiqilmoqda", country: "UZ",
      documentType: "passport", legalName: "Aziz Karimov",
      birthDate: "1995-01-01", documents: ["data:image/jpeg;base64,AA"],
      submittedAt: new Date().toISOString(),
    }]));
  });
  await page.goto(`${BASE}/admin/verifikatsiya`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tasdiqlash" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Rad etish" }).click();
  assert(await page.getByText("Rad etish sababini kamida 10 belgi bilan kiriting.").isVisible(), "KYC rejected without reason");
  await page.getByRole("dialog").getByLabel("Rad etilsa — sabab").fill("Hujjat rasmi o‘qilmaydi");
  await page.getByRole("dialog").getByRole("button", { name: "Rad etish" }).click();
  const kyc = await page.evaluate(() => JSON.parse(localStorage.getItem("sb2_verifications")));
  assert(kyc[0].status === "rad_etilgan" && kyc[0].rejectionReason, "KYC decision not persisted");

  // Yangi admin credential oqimi.
  await page.evaluate(() => localStorage.removeItem("sb2_admin_session"));
  await login(page, "logic.admin@bobododa.uz", "LogicAdmin2026");

  // Granular RBAC: permission olib tashlansa direct URL ham yopilishi kerak.
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("sb2_admin_session"));
    const admins = JSON.parse(localStorage.getItem("sb2_admin_accounts"));
    localStorage.setItem("sb2_admin_accounts", JSON.stringify(
      admins.map((item) => item.id === session.adminId ? { ...item, permissions: ["dashboard"] } : item)
    ));
  });
  await page.goto(`${BASE}/admin/foydalanuvchilar`, { waitUntil: "networkidle" });
  await page.waitForURL("**/admin/ruxsat-yoq");

  // Muddati tugagan sessiya yopiq route'ga kiritmasligi kerak.
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("sb2_admin_session"));
    localStorage.setItem("sb2_admin_session", JSON.stringify({ ...session, expiresAt: "2000-01-01T00:00:00.000Z" }));
  });
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForURL("**/admin/kirish");

  const audit = await page.evaluate(() => JSON.parse(localStorage.getItem("sb2_admin_audit") || "[]"));
  assert(audit.some((item) => item.action === "Yangi admin yaratildi"), "admin creation not audited");
  assert(audit.some((item) => item.action === "KYC rad etildi"), "KYC decision not audited");

  console.log(JSON.stringify({
    ok: true,
    checks: [
      "new admin credential login",
      "separate role-specific login portals",
      "commission bounds and settings persistence",
      "payment pause persistence",
      "incident creation and state transition",
      "KYC rejection reason and persistence",
      "granular direct-route RBAC",
      "expired session rejection",
      "audit completeness",
    ],
  }, null, 2));
})()
  .catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
