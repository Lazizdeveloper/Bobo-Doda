import { test, expect } from "@playwright/test";

test.describe("Password Visibility Toggle Suite", () => {
  test("SuperAdmin login (/rahbariyat/kirish) has accessible and working password toggle", async ({
    page,
  }) => {
    const consoleLogs: string[] = [];
    page.on("console", (msg) => consoleLogs.push(msg.text()));

    await page.goto("/rahbariyat/kirish");
    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator('input[autocomplete="current-password"]');
    await expect(passwordInput).toBeVisible();

    // 1. Password hidden initially
    await expect(passwordInput).toHaveAttribute("type", "password");

    // 2. Eye button exists
    const toggleButton = page.locator('button[aria-label="Parolni ko‘rsatish"]');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveAttribute("type", "button");

    // Enter test password
    const testSecret = "SuperSecret123!";
    await passwordInput.fill(testSecret);

    // 3. Eye button reveals value
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(passwordInput).toHaveValue(testSecret);
    await expect(page.locator('button[aria-label="Parolni yashirish"]')).toBeVisible();

    // 4. Second click hides it
    await page.locator('button[aria-label="Parolni yashirish"]').click();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveValue(testSecret);
    await expect(toggleButton).toBeVisible();

    // 5. Button click does not submit form (still on same URL, no error trigger)
    expect(page.url()).toContain("/rahbariyat/kirish");

    // 7. Password remains unchanged
    expect(await passwordInput.inputValue()).toBe(testSecret);

    // 9. Keyboard accessible
    await toggleButton.focus();
    await page.keyboard.press("Space");
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.keyboard.press("Enter");
    await expect(passwordInput).toHaveAttribute("type", "password");

    // 11. No password in console/logs
    for (const log of consoleLogs) {
      expect(log).not.toContain(testSecret);
    }
  });

  test("Operator admin login (/admin/kirish) has working password toggle", async ({
    page,
  }) => {
    await page.goto("/admin/kirish");
    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator('input[autocomplete="current-password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = page.locator('button[aria-label="Parolni ko‘rsatish"]');
    await expect(toggleButton).toBeVisible();

    await passwordInput.fill("OperatorPass456!");
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.locator('button[aria-label="Parolni yashirish"]')).toBeVisible();

    await page.locator('button[aria-label="Parolni yashirish"]').click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("Buyer/User login (/kirish) has working password toggle", async ({ page }) => {
    await page.goto("/kirish");
    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator('input[autocomplete="current-password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = page.locator('button[aria-label="Parolni ko‘rsatish"]');
    await expect(toggleButton).toBeVisible();

    await passwordInput.fill("UserPassword789!");
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.locator('button[aria-label="Parolni yashirish"]')).toBeVisible();

    await page.locator('button[aria-label="Parolni yashirish"]').click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("Mobile responsive viewports render password toggle properly", async ({
    page,
  }) => {
    const mobileWidths = [320, 360, 390, 430];

    for (const width of mobileWidths) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/rahbariyat/kirish");
      await page.waitForLoadState("networkidle");

      const toggleButton = page.locator('button[aria-label="Parolni ko‘rsatish"]');
      await expect(toggleButton).toBeVisible();

      const box = await toggleButton.boundingBox();
      expect(box).not.toBeNull();
      // Ensure button is within viewport bounds
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.width).toBeGreaterThanOrEqual(24);
      expect(box!.height).toBeGreaterThanOrEqual(24);
    }
  });
});
