import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_BASE_URL,
  E2E_STAFF_PASSWORD,
  SESSION_ADMIN_EMAIL,
  revokeStaffSessions,
  staffLogin,
} from "./admin-helpers";

/**
 * Admin sessiya hayot sikli — 2026-09 production hodisasi regressiyasi:
 * sahifa yangilanganda birinchi so'rovlar TOKENSIZ ketib 401 qaytarardi,
 * server sessiyasi o'lganda esa (parol rotatsiyasi/bekor qilish) eski
 * `bd_staff_account` bo'yicha soxta "kirgan" panel qolardi va super_admin
 * uni rad etadigan operator login sahifasiga yuborilardi.
 *
 * Header QIYMATLARI hech qachon o'qilmaydi — faqat bor/yo'qligi.
 */

interface SeenStaffCall {
  path: string;
  hasAuth: boolean;
  status: number;
}

/** Faqat shu chaqiruvdan KEYIN yuborilgan so'rovlar yoziladi (oldingi sahifaning kechikkan javoblari aralashmaydi). */
function trackStaffCalls(page: Page): SeenStaffCall[] {
  const seen: SeenStaffCall[] = [];
  const issuedAfterStart = new WeakSet<object>();
  page.on("request", (req) => issuedAfterStart.add(req));
  page.on("response", (res) => {
    if (!issuedAfterStart.has(res.request())) return;
    const url = new URL(res.url());
    if (!url.pathname.includes("/api/v1/staff/")) return;
    seen.push({
      path: url.pathname.replace("/api/v1", "") + url.search,
      hasAuth: Boolean(res.request().headers()["authorization"]),
      status: res.status(),
    });
  });
  return seen;
}

/**
 * Login → panel SPA navigatsiyasi bir xil hujjatda bo'ladi, shuning uchun
 * `waitForLoadState("networkidle")` darhol qaytadi (hujjat allaqachon login
 * sahifasida idle bo'lgan). Haqiqiy reload yangi hujjat — shundagina panelning
 * dastlabki so'rovlari tugaganini kutish ma'noga ega (login emas, refresh sarflanadi).
 */
async function settleDashboard(page: Page): Promise<void> {
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("E2E Session Admin").first()).toBeVisible();
}

const dataCalls = (seen: SeenStaffCall[]) => seen.filter((c) => !c.path.startsWith("/staff/auth/"));
const refreshStatuses = (seen: SeenStaffCall[]) =>
  seen.filter((c) => c.path === "/staff/auth/refresh").map((c) => c.status);

async function delayRefresh(page: Page): Promise<void> {
  // localhost javobi ~5ms; production tarmog'ida refresh kechikadi — tuzatishsiz
  // panel so'rovlari refresh qaytishidan OLDIN tokensiz ketardi.
  await page.route("**/api/v1/staff/auth/refresh", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
}

test.describe("Admin sessiya hayot sikli", () => {
  test("reload: token HAR QANDAY ma'lumot so'rovidan OLDIN tiklanadi; hisoblagichlar (/staff/services ham) 200", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await staffLogin(page, SESSION_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
    await settleDashboard(page);

    await delayRefresh(page);
    const seen = trackStaffCalls(page);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("E2E Session Admin").first()).toBeVisible();

    const data = dataCalls(seen);
    expect(data.length).toBeGreaterThan(0);
    expect(data.filter((c) => !c.hasAuth)).toEqual([]);
    expect(data.filter((c) => c.status >= 400)).toEqual([]);
    expect(data.some((c) => c.path.startsWith("/staff/services?perPage=1"))).toBe(true);
    expect(refreshStatuses(seen)).toEqual([200]);
    await context.close();
  });

  for (const withLatency of [false, true]) {
    test(`server tomonida bekor qilingan sessiya → soxta panel YO'Q: to'g'ri /rahbariyat/kirish, holat tozalanadi, ma'lumot so'rovi yuborilmaydi (refresh kechikishi: ${withLatency})`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await staffLogin(page, SESSION_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
      await settleDashboard(page);

      revokeStaffSessions(SESSION_ADMIN_EMAIL);
      if (withLatency) await delayRefresh(page);
      const seen = trackStaffCalls(page);
      await page.reload();
      await page.waitForURL((url) => url.pathname === "/rahbariyat/kirish", { timeout: 10_000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();

      const stored = await page.evaluate(() => [
        window.localStorage.getItem("bd_staff_account"),
        window.localStorage.getItem("bd_staff_session"),
      ]);
      expect(stored).toEqual([null, null]);
      expect(dataCalls(seen)).toEqual([]);
      expect(refreshStatuses(seen)).toEqual([401]);
      await context.close();
    });
  }

  test("panel ochiq turganda sessiya bekor qilinsa → keyingi so'rov refresh'i rad etiladi → /rahbariyat/kirish (operator login EMAS)", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await staffLogin(page, SESSION_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
    await settleDashboard(page);

    revokeStaffSessions(SESSION_ADMIN_EMAIL);
    await page.getByRole("link", { name: "Foydalanuvchilar" }).first().click();
    await page.waitForURL((url) => url.pathname === "/rahbariyat/kirish", { timeout: 10_000 });
    expect(await page.evaluate(() => window.localStorage.getItem("bd_staff_account"))).toBeNull();
    await context.close();
  });

  test("eski (serverda o'lik) saqlangan hisob bilan login sahifasi formani ko'rsatadi — panelga qaytarmaydi", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${ADMIN_BASE_URL}/rahbariyat/kirish`, { waitUntil: "networkidle" });
    // Cookie'siz brauzerdagi eski UI nusxasi — login qilinmaydi (login byudjeti sarflanmaydi).
    await page.evaluate(() => {
      window.localStorage.setItem(
        "bd_staff_account",
        JSON.stringify({
          id: "00000000-0000-7000-8000-000000000000",
          fullName: "Stale Admin",
          email: "stale@e2e.test",
          role: "super_admin",
          title: "",
          active: true,
          permissions: ["dashboard"],
          createdAt: "",
          mustChangePassword: false,
          mfaEnabled: false,
        }),
      );
    });
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/rahbariyat/kirish");
    expect(await page.evaluate(() => window.localStorage.getItem("bd_staff_account"))).toBeNull();
    await context.close();
  });
});
