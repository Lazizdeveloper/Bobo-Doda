import { test, expect } from "@playwright/test";
import { setupApprovedSeller, loginBuyer } from "./helpers";

test.describe("Auth Navigation & Existing Session Redirect Regression Suite", () => {
  // 1. anonymous /kirish -> login visible
  test("1. anonymous /kirish -> login visible", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/kirish", { waitUntil: "networkidle" });
    await expect(page.getByText("Tizimga kirish")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /^Kirish$/i })).toBeVisible();
    expect(page.url()).toContain("/kirish");

    await context.close();
  });

  // 2. authenticated BUYER /kirish -> buyer canonical route
  test("2. authenticated BUYER /kirish -> buyer canonical route", async ({ browser }) => {
    const { context, page } = await loginBuyer(browser);

    await page.goto("/kirish");
    await page.waitForURL((url) => url.pathname === "/xaridor", { timeout: 10_000 });
    expect(page.url()).toContain("/xaridor");

    // Login form should not be visible
    await expect(page.getByText("Tizimga kirish")).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    await context.close();
  });

  // 3. authenticated SELLER /kirish -> seller canonical route
  test("3. authenticated SELLER /kirish -> seller canonical route", async ({ browser }) => {
    const { context, page } = await setupApprovedSeller(browser);

    await page.goto("/kirish");
    await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });
    expect(page.url()).toContain("/mutaxassis");

    // Login form should not be visible
    await expect(page.getByText("Tizimga kirish")).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    await context.close();
  });

  // 4. hard reload with valid session -> correct dashboard
  test("4. hard reload with valid session -> correct dashboard", async ({ browser }) => {
    const { context, page } = await setupApprovedSeller(browser);

    await page.goto("/kirish");
    await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });

    // Hard reload on /kirish
    await page.goto("/kirish");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });
    expect(page.url()).toContain("/mutaxassis");
    await expect(page.getByText("Tizimga kirish")).toHaveCount(0);

    await context.close();
  });

  // 5. new tab /kirish with valid session -> correct dashboard
  test("5. new tab /kirish with valid session -> correct dashboard", async ({ browser }) => {
    const { context } = await setupApprovedSeller(browser);

    const newTab = await context.newPage();
    await newTab.goto("/kirish");
    await newTab.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });
    expect(newTab.url()).toContain("/mutaxassis");
    await expect(newTab.getByText("Tizimga kirish")).toHaveCount(0);

    await newTab.close();
    await context.close();
  });

  // 6. expired session -> login
  test("6. expired session -> login", async ({ browser }) => {
    const context = await browser.newContext();
    // Simulate expired / bogus refresh cookie and stale session snapshot
    await context.addCookies([
      {
        name: "refresh_token",
        value: "expired-or-revoked-token-uuid-0000",
        domain: "localhost",
        path: "/api/v1/auth",
        httpOnly: true,
        secure: false,
        sameSite: "Strict",
      },
    ]);

    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "bd_session",
        JSON.stringify({
          userId: "stale-user-123",
          role: "mutaxassis",
          profileDone: true,
          verified: true,
        }),
      );
    });

    await page.goto("/kirish", { waitUntil: "networkidle" });
    await expect(page.getByText("Tizimga kirish")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verify stale session was cleared
    const storedSession = await page.evaluate(() => window.localStorage.getItem("bd_session"));
    expect(storedSession).toBeNull();
    expect(page.url()).toContain("/kirish");

    await context.close();
  });

  // 7. seller landing CTA -> correct flow
  test("7. seller landing CTA -> correct flow", async ({ browser }) => {
    const { context, page } = await setupApprovedSeller(browser);

    // Go to landing page
    await page.goto("/", { waitUntil: "networkidle" });

    // Click Kirish CTA
    const kirishBtn = page.locator("a.nav-btn-login, a[href*='/kirish?tab=kirish']").first();
    await kirishBtn.click();
    await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });
    expect(page.url()).toContain("/mutaxassis");

    // Return to landing and click Ish topish CTA (href="/kirish?tab=register&role=mutaxassis")
    await page.goto("/", { waitUntil: "networkidle" });
    const findWorkBtn = page.locator("a.btn-find-work, a[href*='role=mutaxassis']").first();
    await findWorkBtn.click();
    await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });
    expect(page.url()).toContain("/mutaxassis");

    await context.close();
  });

  // 8. buyer landing CTA -> correct flow
  test("8. buyer landing CTA -> correct flow", async ({ browser }) => {
    // 8a. Authenticated Buyer clicks Kirish & E'lon berish
    const { context, page } = await loginBuyer(browser);

    await page.goto("/", { waitUntil: "networkidle" });
    const kirishBtn = page.locator("a.nav-btn-login, a[href*='/kirish?tab=kirish']").first();
    await kirishBtn.click();
    await page.waitForURL((url) => url.pathname === "/xaridor", { timeout: 10_000 });
    expect(page.url()).toContain("/xaridor");

    await page.goto("/", { waitUntil: "networkidle" });
    const postJobBtn = page.locator("a.btn-apply-header, a[href*='role=xaridor']").first();
    await postJobBtn.click();
    await page.waitForURL((url) => url.pathname === "/xaridor", { timeout: 10_000 });
    expect(page.url()).toContain("/xaridor");

    await context.close();

    // 8b. Anonymous user clicks Ish topish -> sent to registration with role
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto("/", { waitUntil: "networkidle" });
    const anonFindWork = anonPage.locator("a.btn-find-work, a[href*='role=mutaxassis']").first();
    await anonFindWork.click();
    await anonPage.waitForURL((url) => url.pathname.includes("/royxatdan-otish"), { timeout: 10_000 });
    expect(anonPage.url()).toContain("/royxatdan-otish");
    expect(anonPage.url()).toContain("role=mutaxassis");

    await anonContext.close();
  });

  // 9. no redirect loop
  test("9. no redirect loop", async ({ browser }) => {
    const { context, page } = await setupApprovedSeller(browser);

    for (let i = 0; i < 3; i++) {
      await page.goto("/kirish");
      await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });
      expect(page.url()).toContain("/mutaxassis");

      await page.goto("/", { waitUntil: "networkidle" });
      expect(page.url()).toBe("http://localhost:3010/");
    }

    await context.close();
  });

  // 10. no login form flash if practical to assert
  test("10. no login form flash if practical to assert", async ({ browser }) => {
    const { context, page } = await setupApprovedSeller(browser);

    // Install MutationObserver BEFORE navigation to catch ANY appearance of login form
    await page.addInitScript(() => {
      (window as unknown as { __formFlashed: boolean }).__formFlashed = false;
      const observer = new MutationObserver(() => {
        if (
          document.querySelector('input[type="password"]') ||
          document.querySelector("form[novalidate]")
        ) {
          (window as unknown as { __formFlashed: boolean }).__formFlashed = true;
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });

    await page.goto("/kirish");
    await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });

    const formFlashed = await page.evaluate(
      () => (window as unknown as { __formFlashed: boolean }).__formFlashed,
    );
    expect(formFlashed).toBe(false);

    await context.close();
  });
});
