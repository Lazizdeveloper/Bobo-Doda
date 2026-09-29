import { test, expect } from "@playwright/test";

test.describe("i18n & Translation Keys Audit", () => {
  test("Help Center breadcrumb/back link renders natural language labels in UZ, RU, and EN (no nav.home)", async ({
    page,
  }) => {
    // 1. UZ (Default)
    await page.goto("/yordam-markazi");
    await page.waitForLoadState("domcontentloaded");

    const backButton = page.locator("main a[href='/']");
    await expect(backButton).toBeVisible();

    // UZ assertion
    await expect(page.locator("body")).not.toContainText("nav.home");
    await expect(backButton).toContainText("Bosh sahifa");

    // 2. Switch to RU
    const ruSwitch = page.locator("button", { hasText: /^ru$/i });
    await expect(ruSwitch).toBeVisible();
    await ruSwitch.click();

    // RU assertion — REGRESSION CHECK
    await expect(page.locator("body")).not.toContainText("nav.home");
    await expect(backButton).toContainText("На главную");
    await expect(page.locator("h1")).toContainText("Центр помощи");

    // 3. Switch to EN
    const enSwitch = page.locator("button", { hasText: /^en$/i });
    await expect(enSwitch).toBeVisible();
    await enSwitch.click();

    // EN assertion
    await expect(page.locator("body")).not.toContainText("nav.home");
    await expect(backButton).toContainText("Home");
    await expect(page.locator("h1")).toContainText("Help Center");

    // 4. Switch back to UZ
    const uzSwitch = page.locator("button", { hasText: /^uz$/i });
    await expect(uzSwitch).toBeVisible();
    await uzSwitch.click();
    await expect(backButton).toContainText("Bosh sahifa");
    await expect(page.locator("h1")).toContainText("Yordam markazi");
    await expect(page.locator("body")).not.toContainText("nav.home");
  });

  test("Help Article detail page renders valid back link and content across locales", async ({
    page,
  }) => {
    await page.goto("/yordam-markazi/escrow-qanday-ishlaydi");
    await page.waitForLoadState("domcontentloaded");

    const backButton = page.locator("a[href='/yordam-markazi']");
    await expect(backButton).toBeVisible();

    // UZ
    await expect(page.locator("body")).not.toContainText("hc.back");
    await expect(backButton).toContainText("Yordam markaziga qaytish");

    // Switch to RU
    await page.locator("button", { hasText: /^ru$/i }).click();
    await expect(page.locator("body")).not.toContainText("hc.back");
    await expect(backButton).toContainText("Назад в центр помощи");

    // Switch to EN
    await page.locator("button", { hasText: /^en$/i }).click();
    await expect(page.locator("body")).not.toContainText("hc.back");
    await expect(backButton).toContainText("Back to Help Center");
  });

  const routesToCheck = [
    { name: "Landing", path: "/" },
    { name: "Login", path: "/kirish" },
    { name: "Register", path: "/royxatdan-otish" },
    { name: "Forgot Password", path: "/parolni-unutdim" },
    { name: "FAQ", path: "/savol-javob" },
  ];

  for (const { name, path } of routesToCheck) {
    test(`No leaked translation keys on ${name} (${path}) across locales`, async ({
      page,
    }) => {
      // Test across RU and UZ
      for (const lang of ["uz", "ru", "en"] as const) {
        await page.addInitScript((l) => {
          window.localStorage.setItem("sb_lang", l);
        }, lang);

        await page.goto(path);
        await page.waitForLoadState("domcontentloaded");

        // Common leaked prefixes must not be visible as raw dot-separated keys
        const forbiddenPatterns = [
          "nav.home",
          "nav.dashboard",
          "nav.offers",
          "auth.title",
          "common.error",
          "bset.notifSaved",
          "ntf.milestoneApproved",
          "ntf.newContract",
        ];

        const bodyText = await page.locator("body").innerText();
        for (const pattern of forbiddenPatterns) {
          expect(bodyText).not.toContain(pattern);
        }
      }
    });
  }
});
