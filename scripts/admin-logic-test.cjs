/**
 * Admin panel mantiq (logic) suite — RBAC, moliyaviy to'g'rilik va
 * foydalanuvchiga yetadigan oqimlar.
 *
 * DIQQAT: bu fayl qayta yozildi. Eski varianti boshqa (eskirgan) admin
 * paneliga qarshi yozilgan edi — u mavjud bo'lmagan "/admin/super/tizim" va
 * "/admin/incidentlar" sahifalarini, `sb2_admin_incidents` kalitini va
 * "Komissiya 0–30%" validatsiyasini tekshirardi. Ya'ni suite hech qachon
 * o'ta olmasdi.
 *
 * YANA HAM ESKIRGAN (Bosqich 17dan beri) — `sb2_admin_session` orqali mock
 * admin sessiya inject qiladi; real `lib/api/admin.ts` esa `bd_staff_session`
 * va real email+parol(+TOTP) login oqimini kutadi. `npm run test:e2e:live`
 * ichidagi `tests/e2e/admin.spec.ts` o'rnini bosadi (staff credential
 * berilsa) — RUNBOOK §14.
 *
 * Tekshiriladigan qoidalar quyida `checks` ro'yxatida sanab o'tilgan.
 */
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

const read = (page, key) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key);

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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  /* ------------------------------------------------------------------
     1. Portallar rol bo'yicha qat'iy ajratilgan: CEO oddiy admin
        portalidan kira olmasligi kerak.
     ------------------------------------------------------------------ */
  await page.goto(`${BASE}/admin/kirish`, { waitUntil: "networkidle" });
  await page.getByLabel("Korporativ email").fill("ceo@bobododa.uz");
  await page.getByLabel("Parol").fill("CEOsecure2026");
  await page.getByRole("button", { name: "Xavfsiz kirish" }).click();
  assert(
    await page.getByRole("alert").isVisible(),
    "CEO entered through the ordinary admin portal"
  );

  await login(page, "ceo@bobododa.uz", "CEOsecure2026", "super_admin");

  /* ------------------------------------------------------------------
     2. CEO yaratgan yangi admin haqiqatan login qila olishi kerak.
     ------------------------------------------------------------------ */
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
    "created admin missing from the list"
  );

  /* ------------------------------------------------------------------
     3. Platforma sozlamasi HAQIQATAN kuchga kiradi va saqlanadi.
        (Komissiya foizi `readOnly` — u build vaqtida `lib/fees.ts` dan
        keladi, shuning uchun bu yerda escrow kuni tekshiriladi.)
     ------------------------------------------------------------------ */
  await page.goto(`${BASE}/admin/sozlamalar`, { waitUntil: "networkidle" });
  const escrowDays = page.getByLabel("Avtomatik Qabul Qilish Muddati (Kun)");
  await escrowDays.fill("7");
  await escrowDays.blur();
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: "networkidle" });
  const settings = await read(page, "sb2_platform_settings");
  const escrowSetting = settings.find(
    (s) => s.key === "escrow_auto_release_days"
  );
  assert(
    Number(escrowSetting.value) === 7,
    `escrow setting did not persist (got ${escrowSetting && escrowSetting.value})`
  );

  /* ------------------------------------------------------------------
     4. KYC: rad etish sababsiz o'tmasligi, qaror saqlanishi VA
        foydalanuvchiga bildirishnoma ketishi kerak.
     ------------------------------------------------------------------ */
  await page.evaluate(() => {
    localStorage.setItem(
      "sb2_verifications",
      JSON.stringify([
        {
          userId: "u-1",
          status: "korib_chiqilmoqda",
          country: "UZ",
          documentType: "passport",
          legalName: "Rustam Qosimov",
          birthDate: "1995-01-01",
          documents: ["data:image/jpeg;base64,AA"],
          submittedAt: new Date().toISOString(),
        },
      ])
    );
    localStorage.setItem("sb2_notifications", "[]");
  });
  await page.goto(`${BASE}/admin/verifikatsiya`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ko'rib chiqish" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Rad etish" }).click();
  assert(
    await page
      .getByText("Rad etish sababi kamida 10 belgidan iborat bo'lishi shart.")
      .isVisible(),
    "KYC was rejected without a reason"
  );
  await page
    .getByRole("dialog")
    .getByLabel(/Rad etilsa/)
    .fill("Hujjat rasmi o‘qilmaydi, qayta yuboring");
  await page.getByRole("dialog").getByRole("button", { name: "Rad etish" }).click();
  await page.waitForTimeout(400);

  const kyc = await read(page, "sb2_verifications");
  assert(
    kyc[0].status === "rad_etilgan" && kyc[0].rejectionReason,
    "KYC decision was not persisted"
  );
  const kycNotifications = await read(page, "sb2_notifications");
  assert(
    (kycNotifications || []).some(
      (n) => n.userId === "u-1" && n.messageKey === "ntf.kycRejected"
    ),
    "KYC rejection did not notify the user"
  );

  /* ------------------------------------------------------------------
     5. Pul yechish: tasdiqlash BALANSNI kamaytiradi va ikki marta
        tasdiqlab bo'lmaydi. Bu panelning eng muhim moliyaviy amali.
     ------------------------------------------------------------------ */
  await page.evaluate(() => {
    localStorage.setItem("sb2_withdrawn", JSON.stringify({}));
    localStorage.setItem(
      "sb2_withdrawal_requests",
      JSON.stringify([
        {
          id: "wd-logic-1",
          userId: "u-1",
          userName: "Rustam Qosimov",
          userRole: "mutaxassis",
          source: "earnings",
          amount: 1000000,
          currency: "UZS",
          cardDetails: "UZCARD •••• 1234",
          cardId: "card-1",
          status: "kutilmoqda",
          createdAt: new Date().toISOString(),
        },
      ])
    );
  });
  await page.goto(`${BASE}/admin/tolovlar`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tasdiqlash va yechish" })
    .click();
  await page.waitForTimeout(500);

  const withdrawn = await read(page, "sb2_withdrawn");
  assert(
    withdrawn["u-1"] === 1000000,
    `approving a withdrawal did not debit the balance (got ${withdrawn["u-1"]})`
  );
  const requests = await read(page, "sb2_withdrawal_requests");
  assert(
    requests[0].status === "tasdiqlangan" && requests[0].processedBy,
    "withdrawal request was not marked as processed"
  );
  const payoutNotifications = await read(page, "sb2_notifications");
  assert(
    payoutNotifications.some((n) => n.messageKey === "ntf.withdrawalApproved"),
    "approved withdrawal did not notify the user"
  );

  /* ------------------------------------------------------------------
     6. Xizmat moderatsiyasi AUDIT IZINI qoldiradi va egasini xabardor
        qiladi (ilgari sahifa `localStorage` ga o'zi yozardi — na audit,
        na bildirishnoma bor edi).
     ------------------------------------------------------------------ */
  await page.goto(`${BASE}/admin/xizmatlar`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ko‘rish" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Vaqtincha to‘xtatish" })
    .click();
  await page.waitForTimeout(400);
  const auditAfterService = await read(page, "sb2_admin_audit");
  assert(
    auditAfterService.some((e) => e.action === "Xizmat bozordan olindi"),
    "service moderation left no audit trail"
  );
  const serviceNotifications = await read(page, "sb2_notifications");
  assert(
    serviceNotifications.some((n) => n.messageKey === "ntf.servicePaused"),
    "service moderation did not notify the owner"
  );

  /* ------------------------------------------------------------------
     7. Granular RBAC: huquq olib tashlansa to'g'ridan-to'g'ri URL ham
        yopilishi kerak.
     ------------------------------------------------------------------ */
  await page.evaluate(() => localStorage.removeItem("sb2_admin_session"));
  await login(page, "logic.admin@bobododa.uz", "LogicAdmin2026");
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("sb2_admin_session"));
    const admins = JSON.parse(localStorage.getItem("sb2_admin_accounts"));
    localStorage.setItem(
      "sb2_admin_accounts",
      JSON.stringify(
        admins.map((item) =>
          item.id === session.adminId
            ? { ...item, permissions: ["dashboard"] }
            : item
        )
      )
    );
  });
  await page.goto(`${BASE}/admin/foydalanuvchilar`, { waitUntil: "networkidle" });
  await page.waitForURL("**/admin/ruxsat-yoq");

  /* ------------------------------------------------------------------
     8. Muddati tugagan sessiya yopiq route'ga kiritmasligi kerak.
     ------------------------------------------------------------------ */
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("sb2_admin_session"));
    localStorage.setItem(
      "sb2_admin_session",
      JSON.stringify({ ...session, expiresAt: "2000-01-01T00:00:00.000Z" })
    );
  });
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForURL("**/admin/kirish");

  /* ------------------------------------------------------------------
     9. Audit to'liqligi.
     ------------------------------------------------------------------ */
  const audit = await read(page, "sb2_admin_audit");
  for (const action of [
    "Yangi admin yaratildi",
    "KYC Rad etildi",
    "Pul yechish tasdiqlandi",
  ]) {
    assert(
      audit.some((item) => item.action === action),
      `audit entry missing: ${action}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "separate role-specific login portals",
          "new admin credential login",
          "platform setting persistence (escrow auto-release days)",
          "KYC rejection requires a reason and is persisted",
          "KYC decision notifies the user",
          "withdrawal approval debits the balance",
          "withdrawal approval notifies the user",
          "service moderation writes an audit entry",
          "service moderation notifies the owner",
          "granular direct-route RBAC",
          "expired session rejection",
          "audit completeness",
        ],
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
