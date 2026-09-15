import { test, expect } from "@playwright/test";
import { freshPhone, latestOtpFor, flushOtpCooldown, E2E_PASSWORD } from "./helpers";

/* Bosqich 21 — parol bilan login. SMS FAQAT ro'yxatdan o'tish va parolni
   tiklashda (telefon egaligini isbotlash) — oddiy login uchun SMS UMUMAN
   yuborilmaydi. Bu fayl `globalSetup`dagi saqlangan sessiyalardan
   foydalanmaydi — login/register/forgot-password ekranlarining o'zini
   sinaydi, shuning uchun ATAYLAB `storageState`siz ishlaydi. OTP so'rovlari
   soni ATAYLAB minimal ushlanadi (IP-soatlik chegara budjetini tejash
   uchun) — har bir test aniq nechta so'rov yuborishini yuqorida hisoblab
   qo'ying. */

test("login sahifasi telefon+parol bilan render bo'ladi, OTP formasi YO'Q", async ({ page }) => {
  await page.goto("/kirish");
  await expect(page.getByText("Tizimga kirish")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /^Kirish$/i })).toBeVisible();
  // Bosqich 20'dagi "Kod yuborish" tugmasi endi login sahifasida YO'Q.
  await expect(page.getByRole("button", { name: /Kod yuborish/i })).toHaveCount(0);
  await expect(page.getByText(/Google|Telegram|Email/i)).toHaveCount(0);
});

test("register sahifasi to'g'ri render bo'ladi", async ({ page }) => {
  await page.goto("/royxatdan-otish");
  await expect(page.getByRole("button", { name: /Kod yuborish/i })).toBeVisible();
  await expect(page.getByText(/Google|Telegram|Email/i)).toHaveCount(0);
});

test("REGISTER: telefon → SMS OTP → parol → hisob yaratiladi → rol tanlash → dashboard", async ({ page }) => {
  const phone = freshPhone();
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);

  const code = latestOtpFor(phone);
  await page.locator("input").first().fill(code);
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/royxatdan-otish/parol", { timeout: 10_000 });

  // Parol maydonlari — OTP kodi bu bosqichda QAYTA ISHLATILMAYDI.
  const passwordInputs = page.locator('input[type="password"]');
  await expect(passwordInputs).toHaveCount(2);
  await passwordInputs.nth(0).fill(E2E_PASSWORD);
  await passwordInputs.nth(1).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /Hisob yaratish/i }).click();

  await page.waitForURL("**/rol-tanlash", { timeout: 10_000 });
  await page.getByText("Xaridor", { exact: false }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });
});

test("LOGIN: mavjud telefon+parol → dashboard, OTP sahifasiga UMUMAN o'tilmaydi", async ({ page }) => {
  // 1-so'rov: to'liq REGISTER (fixture sifatida).
  const phone = freshPhone();
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/royxatdan-otish/parol", { timeout: 10_000 });
  const regPasswordInputs = page.locator('input[type="password"]');
  await regPasswordInputs.nth(0).fill(E2E_PASSWORD);
  await regPasswordInputs.nth(1).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /Hisob yaratish/i }).click();
  await page.waitForURL("**/rol-tanlash", { timeout: 10_000 });
  await page.getByText("Xaridor", { exact: false }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });

  // Sessiyadan chiqamiz — endi MAVJUD telefon bilan haqiqiy telefon+parol
  // LOGIN oqimini sinaymiz (SMS SO'RALMAYDI, cooldown/IP budjetiga tegmaydi).
  await page.evaluate(() => window.localStorage.clear());

  await page.goto("/kirish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /^Kirish$/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });

  // Login sahifasidan hech qachon "tasdiqlash"/OTP marshrutiga o'tilmadi.
  expect(page.url()).not.toContain("tasdiqlash");
});

test("LOGIN: noto'g'ri parol/mavjud bo'lmagan telefon → generic xato, OTP sahifasi YO'Q", async ({ page }) => {
  await page.goto("/kirish");
  await page.locator("input").first().fill(freshPhone().replace("+998", ""));
  await page.locator('input[type="password"]').fill("AnyPassword1");
  await page.getByRole("button", { name: /^Kirish$/i }).click();
  await page.waitForTimeout(800);
  // Muvaffaqiyatsiz urinishdan keyin ham SHU (/kirish) sahifada qolishi kerak.
  expect(page.url()).toContain("/kirish");
  expect(page.url()).not.toContain("tasdiqlash");
  await expect(page.getByText(/noto'g'ri/i)).toBeVisible();
});

test("REGISTER: allaqachon mavjud telefon → parol bosqichida 'hisob allaqachon mavjud' CTA, Kirish tugmasi bor", async ({ page }) => {
  // 1-so'rov: REGISTER — hisob yaratiladi.
  const phone = freshPhone();
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/royxatdan-otish/parol", { timeout: 10_000 });
  const inputs1 = page.locator('input[type="password"]');
  await inputs1.nth(0).fill(E2E_PASSWORD);
  await inputs1.nth(1).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /Hisob yaratish/i }).click();
  await page.waitForURL("**/rol-tanlash", { timeout: 10_000 });

  await page.evaluate(() => window.localStorage.clear());
  // Bir xil telefon+REGISTER uchun cooldown'ni tozalaymiz (real 60s
  // kutmasdan) — production'da foydalanuvchi haqiqatan 60s kutgan bo'lardi.
  flushOtpCooldown(phone, "REGISTER");

  // 2-so'rov: REGISTER — bir xil (endi MAVJUD) telefon; OTP bosqichining
  // o'zi hali muvaffaqiyatli o'tadi (telefon egaligi tasdiqlanadi), lekin
  // parol bosqichida (`complete`) PHONE_EXISTS oshkor bo'ladi.
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/royxatdan-otish/parol", { timeout: 10_000 });
  const inputs2 = page.locator('input[type="password"]');
  await inputs2.nth(0).fill("Boshqa1Parol!");
  await inputs2.nth(1).fill("Boshqa1Parol!");
  await page.getByRole("button", { name: /Hisob yaratish/i }).click();

  await expect(page.getByText(/hisob allaqachon mavjud/i)).toBeVisible({ timeout: 10_000 });
  const cta = page.getByRole("link", { name: /Kirish/i });
  await expect(cta).toBeVisible();
  await cta.click();
  await page.waitForURL("**/kirish", { timeout: 10_000 });
});

test("FORGOT PASSWORD: /kirish → Parolni unutdim → SMS OTP → yangi parol → eski parol ishlamaydi, yangisi ishlaydi", async ({ page }) => {
  // 1-so'rov: REGISTER — hisob yaratiladi (eski parol bilan).
  const phone = freshPhone();
  await page.goto("/royxatdan-otish");
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/royxatdan-otish/parol", { timeout: 10_000 });
  const regInputs = page.locator('input[type="password"]');
  await regInputs.nth(0).fill(E2E_PASSWORD);
  await regInputs.nth(1).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /Hisob yaratish/i }).click();
  await page.waitForURL("**/rol-tanlash", { timeout: 10_000 });
  await page.getByText("Xaridor", { exact: false }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });
  await page.evaluate(() => window.localStorage.clear());

  // /kirish → "Parolni unutdingizmi?" havolasi orqali forgot-password oqimiga.
  await page.goto("/kirish");
  await page.getByRole("link", { name: /Parolni unutdingizmi/i }).click();
  await page.waitForURL("**/parolni-unutdim", { timeout: 10_000 });

  // 2-so'rov: PASSWORD_RESET.
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/parolni-unutdim/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.locator("input").first().fill(latestOtpFor(phone));
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/parolni-unutdim/parol", { timeout: 10_000 });

  const newPassword = "YangiParol2!";
  const resetInputs = page.locator('input[type="password"]');
  await resetInputs.nth(0).fill(newPassword);
  await resetInputs.nth(1).fill(newPassword);
  await page.getByRole("button", { name: /Parolni yangilash/i }).click();

  // Sessiya AVTOMATIK ochilmaydi — /kirish'ga qaytariladi.
  await page.waitForURL("**/kirish", { timeout: 10_000 });

  // Eski parol ENDI ishlamaydi.
  await page.locator("input").first().fill(phone.replace("+998", ""));
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /^Kirish$/i }).click();
  await page.waitForTimeout(800);
  expect(page.url()).toContain("/kirish");

  // Yangi parol ishlaydi.
  await page.locator('input[type="password"]').fill(newPassword);
  await page.getByRole("button", { name: /^Kirish$/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/xaridor"), { timeout: 10_000 });
});
