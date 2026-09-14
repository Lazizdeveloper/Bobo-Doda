import { test, expect } from "@playwright/test";
import { freshPhone, latestOtpFor } from "./helpers";

/* Bu fayl `globalSetup`dagi saqlangan sessiyalardan foydalanmaydi — login
   ekranining o'zini sinaydi, shuning uchun ATAYLAB `storageState`siz ishlaydi
   (playwright.config.ts darajasida global storageState belgilanmagan). Faqat
   BITTA yangi OTP so'raydi (noto'g'ri kod stsenariysi ham bir xil kod
   so'rovidan foydalanadi) — IP-soatlik chegara budjetini tejash uchun. */

test("login sahifasi to'g'ri render bo'ladi", async ({ page }) => {
  await page.goto("/kirish");
  await expect(page.getByText("Tizimga kirish")).toBeVisible();
  await expect(page.getByRole("button", { name: /Kod yuborish/i })).toBeVisible();
});

test("noto'g'ri kod rad etiladi, to'g'ri kod qabul qilinadi", async ({ page }) => {
  const phone = freshPhone();
  await page.goto("/kirish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/kirish/tasdiqlash", { timeout: 10_000 });

  await page.locator("input").first().fill("000000");
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForTimeout(800);
  // Muvaffaqiyatsiz urinishdan keyin ham SHU sahifada qolishi kerak
  expect(page.url()).toContain("tasdiqlash");

  await page.waitForTimeout(400);
  const code = latestOtpFor(phone);
  await page.locator("input").first().fill(code);
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("tasdiqlash"), { timeout: 10_000 });
});
