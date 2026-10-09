import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { setupApprovedSeller } from "./helpers";

test.describe.serial("sotuvchi: boshqaruv va xizmatlar", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ context, page } = await setupApprovedSeller(browser));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("sotuvchi boshqaruv paneli va xizmatlarim ro'yxati yuklanadi", async () => {
    await page.goto("/mutaxassis");
    await expect(page.getByRole("heading", { name: "Boshqaruv" })).toBeVisible();
    await page.goto("/mutaxassis/services");
    await expect(page.getByText("Xizmatlarim").first()).toBeVisible();
  });

  test("yangi xizmat yaratish -> ko'rib chiqishga yuborish (real oqim: DRAFT -> PENDING_REVIEW)", async () => {
    await page.goto("/mutaxassis/services/yangi", { waitUntil: "networkidle" });
    // 4 bosqichli wizard: kategoriya -> sarlavha/tavsif -> narx -> ko'rib chiqish
    await page.locator("button", { hasText: /Dizayn/i }).first().click();
    await page.getByRole("button", { name: /Keyingi/i }).click();

    await page.locator("input").first().fill("E2E test xizmati 2");
    await page.locator("textarea").first().fill("Playwright suite orqali yaratilgan avtomatlashtirilgan test xizmati.");
    await page.getByRole("button", { name: /Keyingi/i }).click();

    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill("500000"); // narx

    // Chegara tekshiruvi: 365 kundan ortiq (masalan, 660000) kiritilsa xatolik ko'rsatiladi va o'tkazilmaydi
    await numberInputs.nth(1).fill("660000");
    await page.getByRole("button", { name: /Keyingi/i }).click();
    await expect(page.getByText(/365 kun/i)).toBeVisible();

    // To'g'ri muddat bilan davom etish
    await numberInputs.nth(1).fill("7"); // bajarish muddati (kun)
    await page.getByRole("button", { name: /Keyingi/i }).click();

    await page.getByRole("button", { name: /Ko'rib chiqishga yuborish/i }).click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/mutaxassis\/services/);
  });

  test("sotuvchi sozlamalari xatosiz yuklanadi", async () => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    await page.goto("/mutaxassis/settings");
    await page.waitForTimeout(500);
    expect(consoleErrors, "sahifa JS xatosiz render bo'lishi kerak").toEqual([]);
  });
});
