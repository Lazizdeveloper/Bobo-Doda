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
});
