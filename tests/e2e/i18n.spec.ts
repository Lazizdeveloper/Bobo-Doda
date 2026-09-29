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
    // 1. Public / Landing
    { name: "Landing", path: "/" },
    { name: "FAQ", path: "/savol-javob" },
    { name: "Terms", path: "/shartlar" },
    { name: "Privacy", path: "/maxfiylik" },
    { name: "Public Offer", path: "/oferta" },
    // 2. Help Center
    { name: "Help Center", path: "/yordam-markazi" },
    // 3. Auth pages
    { name: "Login", path: "/kirish" },
    { name: "Register", path: "/royxatdan-otish" },
    { name: "Forgot Password", path: "/parolni-unutdim" },
    // 4. Buyer panel
    { name: "Buyer Marketplace", path: "/xaridor/bozor" },
    { name: "Buyer Jobs", path: "/xaridor/elonlarim" },
    { name: "Buyer Dashboard", path: "/xaridor" },
    // 5. Seller panel
    { name: "Seller Jobs", path: "/mutaxassis/ish-elonlari" },
    { name: "Seller Services", path: "/mutaxassis/xizmatlarim" },
    { name: "Seller Dashboard", path: "/mutaxassis" },
    // 6. Admin panel
    { name: "Admin Login", path: "/admin/kirish" },
    { name: "Admin Dashboard", path: "/admin" },
    // 7. SuperAdmin panel
    { name: "SuperAdmin Login", path: "/rahbariyat/kirish" },
  ];

  for (const { name, path } of routesToCheck) {
    test(`No leaked translation keys on ${name} (${path}) across locales`, async ({
      page,
    }) => {
      // Test across UZ, RU, and EN
      for (const lang of ["uz", "ru", "en"] as const) {
        await page.addInitScript((l) => {
          window.localStorage.setItem("sb_lang", l);
        }, lang);

        await page.goto(path);
        await page.waitForLoadState("domcontentloaded");

        const bodyText = await page.locator("body").innerText();

        // 1. Explicit critical key assertions
        const criticalForbidden = [
          "nav.home",
          "nav.dashboard",
          "nav.offers",
          "auth.title",
          "common.error",
          "bset.notifSaved",
          "ntf.milestoneApproved",
          "ntf.newContract",
        ];
        for (const pattern of criticalForbidden) {
          expect(bodyText).not.toContain(pattern);
        }

        // 2. Pattern-based check for leaked translation keys
        // Namespaces like nav.*, auth.*, common.*, errors.*, err.*, profile.*, help.*, hc.*,
        // marketplace.*, admin.*, seller.*, buyer.*, support.*, validation.*, val.*, bset.*,
        // ntf.*, cat.*, ms.*, cstatus.*, pstatus.*, ostatus.*, svcStatus.*, badge.*, verify.*
        const leakPattern =
          /\b(nav|auth|common|errors|err|profile|help|hc|marketplace|admin|seller|buyer|support|validation|val|bset|ntf|cat|ms|cstatus|pstatus|ostatus|svcStatus|badge|verify)\.[a-zA-Z0-9_]+\b/g;

        const matches = bodyText.match(leakPattern) || [];
        // Filter out benign domain references if any (e.g. admin.bobododa.uz)
        const leakedKeys = matches.filter(
          (m) => !m.endsWith(".uz") && !m.endsWith(".com") && !m.endsWith(".org")
        );

        expect(
          leakedKeys,
          `Leaked translation keys found on ${name} (${path}) in [${lang}]: ${leakedKeys.join(", ")}`
        ).toEqual([]);
      }
    });
  }
});
