import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { loginBuyer } from "./helpers";

test.describe.serial("xaridor: bozor va sozlamalar", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ context, page } = await loginBuyer(browser));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("xaridor boshqaruv paneli yuklanadi", async () => {
    await page.goto("/xaridor");
    await expect(page.getByRole("heading", { name: "Boshqaruv" })).toBeVisible();
  });

  test("bozor: xizmatlar ro'yxati va filtr ishlaydi", async () => {
    await page.goto("/xaridor/bozor");
    await expect(page.getByRole("heading", { name: "Bozor" })).toBeVisible();
    // Kategoriya bo'yicha filtr, agar mavjud bo'lsa, xatosiz qo'llanadi
    const categoryChip = page.locator("button", { hasText: /Dizayn/i }).first();
    if (await categoryChip.count()) {
      await categoryChip.click();
      await page.waitForTimeout(300);
    }
  });

  test("xaridor sozlamalari xatosiz yuklanadi (real backendda karta/bildirishnoma yo'q)", async () => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    await page.goto("/xaridor/sozlamalar");
    await page.waitForTimeout(500);
    expect(consoleErrors, "sahifa JS xatosiz render bo'lishi kerak").toEqual([]);
  });

  /**
   * Regressiya (Bosqich 18): bu sahifaning `Promise.all()`i ilgari HAQIQIY
   * (jami to'lov/escrow/tarix) chaqiruvlarni UCHTA o'chirilgan chaqiruv
   * (`getCards`/`getPendingWithdrawalTotal`/`listMyWithdrawalRequests`)
   * bilan bitta bloqda ushlardi — birortasi rad etilishi HAMMASINI
   * yiqitardi, ya'ni sahifa HAR BIR xaridor uchun DOIM `<ErrorState>`
   * ko'rsatardi, real ma'lumot HECH QACHON ko'rinmasdi. Tuzatildi:
   * o'chirilgan chaqiruvlar butunlay olib tashlandi.
   */
  test("Xarajatlar: haqiqiy ma'lumot yuklanadi, doimiy ErrorState YO'Q (regressiya)", async () => {
    await page.goto("/xaridor/xarajatlar", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Xarajatlar" })).toBeVisible({ timeout: 8000 });
    // ErrorState o'rniga real statistika kartalari ko'rinishi kerak
    await expect(page.getByText("Jami to'langan")).toBeVisible();
    await expect(page.getByText("So'nggi to'lovlar")).toBeVisible();
    await expect(page.getByRole("button", { name: /qayta urinish|retry/i })).toHaveCount(0);
  });
});
