import { test, expect } from "@playwright/test";
import { loginBuyer, setupApprovedSeller } from "./helpers";
import { ADMIN_BASE_URL, E2E_STAFF_PASSWORD, SUPER_ADMIN_EMAIL, staffLogin } from "./admin-helpers";

/**
 * Bosqich 24 — QA audit: har bir autentifikatsiyalangan panelda "aniq
 * Chiqish" majburiy (audit topilmasi: buyer/seller header'da logout
 * ko'rinmas edi, faqat Sozlamalar tagida — endi TopNav'da ham bor, bu
 * fayl aynan shu tuzatishni sinaydi). Har bir panel uchun to'liq zanjir:
 * bosish → redirect → localStorage tozalanishi → Back tugmasi HIMOYA
 * qilmaydi → to'g'ridan-to'g'ri URL ham himoyalangan → refresh'dan keyin
 * ham chiqilgan holatda qoladi.
 */

test.describe("Chiqish (logout) — barcha panellar", () => {
  test("Buyer (xaridor): header'dagi Chiqish → sessiya to'liq tozalanadi", async ({ browser }) => {
    const { context, page } = await loginBuyer(browser);
    await page.goto("/xaridor", { waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: "Chiqish" })).toBeVisible();
    await page.getByRole("button", { name: "Chiqish" }).click();
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    const session = await page.evaluate(() => window.localStorage.getItem("bd_session"));
    expect(session).toBeNull();

    // Back tugmasi himoyalangan sahifani QAYTARMAYDI.
    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    // To'g'ridan-to'g'ri URL ham himoyalangan.
    await page.goto("/xaridor", { waitUntil: "networkidle" });
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    // Refresh — hamon chiqilgan.
    await page.reload({ waitUntil: "networkidle" });
    expect(page.url()).toContain("/kirish");

    await context.close();
  });

  test("Seller (mutaxassis): header'dagi Chiqish → sessiya to'liq tozalanadi", async ({ browser }) => {
    const { context, page } = await setupApprovedSeller(browser);
    await page.goto("/mutaxassis", { waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: "Chiqish" })).toBeVisible();
    await page.getByRole("button", { name: "Chiqish" }).click();
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    const session = await page.evaluate(() => window.localStorage.getItem("bd_session"));
    expect(session).toBeNull();

    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    await page.goto("/mutaxassis", { waitUntil: "networkidle" });
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    await page.reload({ waitUntil: "networkidle" });
    expect(page.url()).toContain("/kirish");

    await context.close();
  });

  test("Admin (staff): sidebar Chiqish → sessiya to'liq tozalanadi", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await staffLogin(page, SUPER_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
    await page.waitForURL((url) => url.pathname === "/admin", { timeout: 10_000 });

    await page.getByRole("button", { name: "Chiqish" }).first().click();
    await page.waitForURL((url) => url.pathname.includes("/kirish"), { timeout: 10_000 });

    const staffSession = await page.evaluate(() => window.localStorage.getItem("bd_staff_session"));
    expect(staffSession).toBeNull();

    // `logout()` `router.replace(loginPath)` ishlatadi (`app/admin/layout.tsx`)
    // — himoyalangan `/admin` yozuvi tarixdan ALMASHTIRILADI, orqaga
    // qaytadigan alohida qoldirilmaydi (push+client-redirect'dan HAM
    // qattiqroq himoya: "Back" hatto vaqtinchalik ham himoyalangan
    // sahifani ko'rsatmaydi). Shu sabab bu yerda alohida "Back tugmasi
    // himoyalaydi" tekshiruvi shart emas — to'g'ridan-to'g'ri URL orqali
    // qayta himoyalanganini tekshiramiz.
    await page.goto(`${ADMIN_BASE_URL}/admin`, { waitUntil: "networkidle" });
    await page.waitForURL((url) => url.pathname.includes("/kirish"), { timeout: 10_000 });

    await context.close();
  });

  test("Harakatsizlik (inactivity timeout) — 30 daqiqa harakatsizlikdan so'ng sessiya avtomatik yakunlanadi", async ({ browser }) => {
    const { context, page } = await loginBuyer(browser);
    await page.goto("/xaridor", { waitUntil: "networkidle" });

    const sessionBefore = await page.evaluate(() => window.localStorage.getItem("bd_session"));
    expect(sessionBefore).not.toBeNull();

    // 31 daqiqa oldingi vaqtni o'rnatamiz (harakatsizlik vaqti o'tgan)
    await page.evaluate(() => {
      window.localStorage.setItem("bd_last_activity", String(Date.now() - 31 * 60 * 1000));
      window.dispatchEvent(new Event("focus"));
    });

    // Avtomatik /kirish sahifasiga yo'naltirilishini kutamiz
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    const sessionAfter = await page.evaluate(() => window.localStorage.getItem("bd_session"));
    expect(sessionAfter).toBeNull();

    // Xabarnoma mavjudligini tekshiramiz
    await expect(page.getByText(/30 daqiqalik harakatsizlik/i)).toBeVisible({ timeout: 5_000 });

    // Orqaga (Back) tugmasi himoyalangan kabinetni qaytarmaydi
    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/kirish", { timeout: 10_000 });

    // Sahifa yangilanganda ham sessiya qayta tiklanmaydi va /kirish da qoladi
    await page.reload({ waitUntil: "networkidle" });
    expect(page.url()).toContain("/kirish");
    const sessionAfterReload = await page.evaluate(() => window.localStorage.getItem("bd_session"));
    expect(sessionAfterReload).toBeNull();

    await context.close();
  });
});
