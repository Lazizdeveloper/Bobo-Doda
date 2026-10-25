import { test, expect, type Page } from "@playwright/test";
import { flushStaffLoginRateLimit } from "./helpers";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const MODERATOR_EMAIL = "moderator@bobololadono.uz";
const TEST_PASSWORD = "TestPass2026!";

async function loginAsModerator(page: Page): Promise<void> {
  flushStaffLoginRateLimit();
  await page.goto(`${BASE_URL}/admin/kirish`, { waitUntil: "networkidle" });
  await page.getByLabel("Korporativ email yoki telefon").fill(MODERATOR_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Xavfsiz kirish" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/kirish"), { timeout: 10_000 });
}

test.describe("Admin Audit — Xavfsizlik, chekka holatlar va oflayn chidamlilik", () => {
  test.beforeEach(() => {
    flushStaffLoginRateLimit();
  });

  test("1. IDOR / tolovlar sub-yo'llari: barcha /admin/tolovlar/* sub-yo'llari 403 (/admin/ruxsat-yoq) bo'ladi", async ({ page }) => {
    // 1. Moderator login
    await loginAsModerator(page);

    // 2. /admin/tolovlar ga to'g'ridan-to'g'ri o'tish -> 403 /admin/ruxsat-yoq
    await page.goto(`${BASE_URL}/admin/tolovlar`);
    await expect(page).toHaveURL(/ruxsat-yoq/);
    await expect(page.getByText(/403/)).toBeVisible();
    await expect(page.getByText(/Ruxsat yetarli emas/i)).toBeVisible();

    // 3. /admin/tolovlar/wdr-bank-1 ga o'tish -> 404 EMAS, bir xil 403 /admin/ruxsat-yoq bo'lishi shart
    await page.goto(`${BASE_URL}/admin/tolovlar/wdr-bank-1`);
    await expect(page).toHaveURL(/ruxsat-yoq/);
    await expect(page.getByText(/403/)).toBeVisible();
    await expect(page.getByText(/Ruxsat yetarli emas/i)).toBeVisible();

    // 4. Chuqur sub-yo'l: /admin/tolovlar/wdr-bank-1/details -> bir xil 403 /admin/ruxsat-yoq
    await page.goto(`${BASE_URL}/admin/tolovlar/wdr-bank-1/details`);
    await expect(page).toHaveURL(/ruxsat-yoq/);
    await expect(page.getByText(/403/)).toBeVisible();
  });

  test("2. Sessiya va kesh: logout'dan keyin Back tugmasi eski maxfiy dashboardni ko'rsatmaydi", async ({ page }) => {
    // 1. Moderator login
    await loginAsModerator(page);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    await expect(page.getByText(/Boshqaruv/i).first()).toBeVisible();

    // 2. Biror ichki sahifaga o'tib, yana bosh sahifaga qaytamiz (tarix zanjiri yaratish)
    await page.goto(`${BASE_URL}/admin/verifikatsiya`, { waitUntil: "networkidle" });
    await expect(page.getByText(/KYC/i).first()).toBeVisible();

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    await expect(page.getByText(/Boshqaruv/i).first()).toBeVisible();

    // 3. Chiqish tugmasini bosish
    await page.getByRole("button", { name: /Chiqish/i }).first().click();
    await page.waitForURL((url) => url.pathname.includes("/kirish"), { timeout: 10_000 });

    // Sessiya tozalanganligini tasdiqlash
    const sessionData = await page.evaluate(() => [
      window.localStorage.getItem("bd_staff_session"),
      window.localStorage.getItem("bd_staff_account"),
    ]);
    expect(sessionData).toEqual([null, null]);

    // 4. Brauzer Back tugmasini bosish (eski ichki sahifaga qaytishga urinish)
    await page.goBack();
    await page.waitForTimeout(1000);

    // Keshdagi himoyalangan sahifa ochilmasligi, auth-guard / pageshow uni darhol /admin/kirish ga qaytarishi shart
    await page.waitForURL((url) => url.pathname.includes("/kirish"), { timeout: 5000 });
    expect(page.url()).toContain("/kirish");
    await expect(page.getByLabel("Korporativ email yoki telefon")).toBeVisible();
  });

  test("3. Sabab maydoni: 5-500 belgi validatsiyasi, 1000+ belgili payload va jonli hisoblagich", async ({ page }) => {
    // 1. Moderator login
    await loginAsModerator(page);

    // 2. Foydalanuvchilar sahifasiga o'tish
    await page.goto(`${BASE_URL}/admin/foydalanuvchilar`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Foydalanuvchilar" })).toBeVisible();

    // 3. Foydalanuvchini boshqarish
    const manageBtn = page.getByRole("button", { name: /Boshqarish/i }).first();
    await expect(manageBtn).toBeVisible({ timeout: 10_000 });
    await manageBtn.click();

    // Bloklash yoki To'xtatish tugmasi
    const blockBtn = page.getByRole("button", { name: /Bloklash/i });
    const suspendBtn = page.getByRole("button", { name: /To'xtatish/i });
    if (await blockBtn.isVisible()) {
      await blockBtn.click();
    } else {
      await suspendBtn.click();
    }

    // Modal ochilishi va hisoblagich tekshiruvi
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("maxlength", "500");

    // Boshlang'ich hisoblagich
    await expect(page.getByText(/0\/500/)).toBeVisible();

    // Qisqa sabab (< 5 belgi)
    await textarea.fill("abc");
    await expect(page.getByText(/3\/500/)).toBeVisible();
    await expect(page.getByText(/kamida 5 ta belgi/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Tasdiqlash" })).toBeDisabled();

    // 1000+ belgili payload (A*1000 + TEST + B*200) kiritish
    const longPayload = "A".repeat(1000) + "TEST_PAYLOAD" + "B".repeat(200);
    await textarea.fill(longPayload);

    // Maxlength 500 tufayli matn 500 belgida to'xtashi va hisoblagich 500/500 ko'rsatishi shart
    await expect(page.getByText(/500\/500/)).toBeVisible();
    const val = await textarea.inputValue();
    expect(val.length).toBe(500);
    await expect(page.getByRole("button", { name: "Tasdiqlash" })).toBeEnabled();

    // Bekor qilish
    await page.getByRole("button", { name: "Bekor qilish" }).click();

    // 4. KYC Verifikatsiya sahifasidagi rad etish modalini ham tekshiramiz
    await page.goto(`${BASE_URL}/admin/verifikatsiya`, { waitUntil: "networkidle" });
    const reviewBtn = page.getByRole("button", { name: /Ko'rib chiqish/i }).first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      const kycTextarea = page.getByPlaceholder(/Hujjat rasmi xira/i);
      if (await kycTextarea.isVisible()) {
        await expect(kycTextarea).toHaveAttribute("maxlength", "500");
        await expect(page.getByText("0/500")).toBeVisible();
      }
    }
  });

  test("4. Oflayn chidamlilik va aloqa banneri: tarmoq uzilganda ogohlantirish banneri va oq ekransiz ishlash", async ({ page, context }) => {
    // 1. Moderator login
    await loginAsModerator(page);

    // 2. Tarmoqni uzish (offline rejimini emulyatsiya qilish)
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // 3. Ogohlantirish banneri va status indikatori ko'rinishi
    await expect(page.getByText(/Aloqa yo‘q — internetga ulanish uzilgan/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Aloqa yo'q \(Oflayn\)/i)).toBeVisible();

    // 4. Oflayn vaqtida sahifaning bo'sh oq ekran (body.innerText = "") emasligini tekshirish
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    expect(bodyText.length).toBeGreaterThan(0);

    // 5. Tarmoqni tiklash (online rejim)
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    // 6. Banner yo'qolishi va status faollashishi
    await expect(page.getByText(/Bozor Tizimi: Faol/i)).toBeVisible({ timeout: 5000 });
  });
});
