import { test, expect } from "@playwright/test";

/**
 * Xodim/admin panelini haqiqiy `/admin/kirish` orqali sinaydi. Bu sessiyada
 * BAJARILMAGAN: lokal DB'dagi yagona xodim hisobining (`ops-phase4@bobododa.uz`)
 * paroli noma'lum edi va yangi parol/hash yaratish "secret-store write"
 * sifatida bloklandi (RUNBOOK §14, PRODUCTION-READINESS.md §15) — atayin
 * chetlab o'tilmadi.
 *
 * `E2E_STAFF_EMAIL` / `E2E_STAFF_PASSWORD` (va TOTP yoqilgan bo'lsa
 * `E2E_STAFF_TOTP_SECRET`, base32) berilsa bu test haqiqiy login + asosiy
 * ko'rinishlarni (Foydalanuvchilar/Nizolar/To'lovlar/Audit) tekshiradi;
 * berilmasa TUSHUNARLI sabab bilan skip qilinadi (jimgina "yashil" chiqib,
 * qamrov yo'qligini yashirmaydi).
 */
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL;
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD;

test.skip(
  !STAFF_EMAIL || !STAFF_PASSWORD,
  "E2E_STAFF_EMAIL/E2E_STAFF_PASSWORD berilmagan — staff login DB'da parol hash yaratishni talab qiladi, " +
    "bu avtomatik ravishda amalga oshirilmagan (RUNBOOK §14). Qo'lda staff hisob yarating va shu ikki " +
    "env o'zgaruvchini bering.",
);

test("xodim kirishi va asosiy ko'rinishlar yuklanadi", async ({ page }) => {
  await page.goto("/admin/kirish");
  await page.locator('input[type="email"]').fill(STAFF_EMAIL!);
  await page.locator('input[type="password"]').fill(STAFF_PASSWORD!);
  await page.getByRole("button", { name: /Kirish/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/admin/kirish"), { timeout: 10_000 });

  if (page.url().includes("parolni-almashtirish")) {
    test.info().annotations.push({
      type: "note",
      description: "mustChangePassword hard gate ishga tushdi — parolni qo'lda almashtiring va qayta urinib ko'ring.",
    });
    return;
  }

  await page.goto("/admin/foydalanuvchilar", { waitUntil: "networkidle" });
  await expect(page.getByText("Foydalanuvchilar")).toBeVisible();

  await page.goto("/admin/nizolar", { waitUntil: "networkidle" });
  await expect(page.getByText("Nizolar")).toBeVisible();

  await page.goto("/admin/tolovlar", { waitUntil: "networkidle" });
  await expect(page.getByText("To'lovlar")).toBeVisible();

  await page.goto("/admin/audit", { waitUntil: "networkidle" });
  await expect(page.getByText(/[Aa]udit/)).toBeVisible();
});
