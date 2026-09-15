import { test, expect } from "@playwright/test";
import { freshPhone, latestOtpFor, flushOtpCooldown } from "./helpers";

/* Bosqich 20 — Login va Registration ALOHIDA sahifa/oqim
   (`/kirish` vs `/royxatdan-otish`). Bu fayl `globalSetup`dagi saqlangan
   sessiyalardan foydalanmaydi — login/register ekranlarining o'zini
   sinaydi, shuning uchun ATAYLAB `storageState`siz ishlaydi
   (playwright.config.ts darajasida global storageState belgilanmagan).
   OTP so'rovlari soni ATAYLAB minimal ushlanadi (IP-soatlik chegara
   budjetini tejash uchun) — har bir test aniq nechta so'rov yuborishini
   yuqorida hisoblab qo'ying. */

test("login sahifasi to'g'ri render bo'ladi", async ({ page }) => {
  await page.goto("/kirish");
  await expect(page.getByText("Tizimga kirish")).toBeVisible();
  await expect(page.getByRole("button", { name: /Kod yuborish/i })).toBeVisible();
  // Email/Telegram/Google variant YO'Q (OTP siyosati regressiyasi).
  await expect(page.getByText(/Google|Telegram|Email/i)).toHaveCount(0);
});

test("register sahifasi to'g'ri render bo'ladi", async ({ page }) => {
  await page.goto("/royxatdan-otish");
  await expect(page.getByRole("button", { name: /Kod yuborish/i })).toBeVisible();
  await expect(page.getByText(/Google|Telegram|Email/i)).toHaveCount(0);
});

test("REGISTER: yangi telefon → noto'g'ri kod rad etiladi → to'g'ri kod → rol tanlash → dashboard", async ({ page }) => {
  const phone = freshPhone();
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });

  await page.locator("input").first().fill("000000");
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForTimeout(800);
  // Muvaffaqiyatsiz urinishdan keyin ham SHU sahifada qolishi kerak
  expect(page.url()).toContain("tasdiqlash");

  await page.waitForTimeout(400);
  const code = latestOtpFor(phone);
  await page.locator("input").first().fill(code);
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/rol-tanlash", { timeout: 10_000 });

  await page.getByText("Xaridor", { exact: false }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });
});

test("LOGIN: mavjud telefon (avval REGISTER qilingan) → dashboard", async ({ page }) => {
  // 1-so'rov: REGISTER — hisob yaratiladi.
  const phone = freshPhone();
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/rol-tanlash", { timeout: 10_000 });
  await page.getByText("Xaridor", { exact: false }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });

  // Sessiyadan chiqamiz (localStorage'dagi snapshot'ni tozalab, /kirish'ga
  // qaytamiz) — endi MAVJUD telefon bilan haqiqiy LOGIN oqimini sinaymiz.
  await page.evaluate(() => window.localStorage.clear());

  // 2-so'rov: LOGIN — bir xil telefon, boshqa intent (cooldown mustaqil).
  await page.goto("/kirish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/kirish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });
});

test("LOGIN: mavjud bo'lmagan telefon → 'hisob topilmadi' CTA, Ro'yxatdan o'tish tugmasi bor", async ({ page }) => {
  // 1-so'rov: LOGIN — hech qachon ro'yxatdan o'tmagan telefon.
  const phone = freshPhone();
  await page.goto("/kirish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/kirish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();

  await expect(page.getByText(/hisob topilmadi/i)).toBeVisible({ timeout: 10_000 });
  const cta = page.getByRole("link", { name: /Ro'yxatdan o'tish/i });
  await expect(cta).toBeVisible();
  await cta.click();
  await page.waitForURL("**/royxatdan-otish", { timeout: 10_000 });
  // Telefon oldindan to'ldirilgan bo'lishi kerak (prefill UX).
  await expect.poll(async () => (await page.locator("input").first().inputValue()).replace(/\D/g, "")).toBe(
    phone.replace("+998", ""),
  );
});

test("REGISTER: allaqachon mavjud telefon → 'hisob allaqachon mavjud' CTA, Kirish tugmasi bor", async ({ page }) => {
  // 1-so'rov: REGISTER — hisob yaratiladi.
  const phone = freshPhone();
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/rol-tanlash", { timeout: 10_000 });

  await page.evaluate(() => window.localStorage.clear());
  // Bir xil telefon+REGISTER uchun cooldown'ni tozalaymiz (real 60s
  // kutmasdan) — production'da foydalanuvchi haqiqatan 60s kutgan bo'lardi.
  flushOtpCooldown(phone, "REGISTER");

  // 2-so'rov: REGISTER — bir xil (endi MAVJUD) telefon.
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();

  await expect(page.getByText(/hisob allaqachon mavjud/i)).toBeVisible({ timeout: 10_000 });
  const cta = page.getByRole("link", { name: /Kirish/i });
  await expect(cta).toBeVisible();
  await cta.click();
  await page.waitForURL("**/kirish", { timeout: 10_000 });
  await expect.poll(async () => (await page.locator("input").first().inputValue()).replace(/\D/g, "")).toBe(
    phone.replace("+998", ""),
  );
});
