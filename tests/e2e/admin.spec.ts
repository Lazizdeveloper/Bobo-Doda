import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import {
  ADMIN_BASE_URL,
  ADMIN_API_BASE,
  E2E_STAFF_PASSWORD,
  SUPER_ADMIN_EMAIL,
  RESET_ADMIN_EMAIL,
  RESTRICTED_ADMIN_EMAIL,
  staffLogin,
  seedAdminTestData,
  newAdminPage,
} from "./admin-helpers";

/**
 * Bosqich 18 — admin panelining real browser E2E'si, TO'LIQ IZOLYATSIYALANGAN
 * muhitda (RUNBOOK §18): alohida Postgres (:55433) + Redis (:6390) +
 * backend (:4010) + frontend (:3010). Dev/prod bazasiga HECH NARSA
 * yozilmaydi. Bu infra `scratch/e2e-infra/` ostida qo'lda ko'tariladi
 * (skript: `backend/scripts/e2e-staff-fixture.cjs` — real argon2id hash
 * kodi orqali test-only staff yaratadi). Fake JWT/localStorage bypass/TOTP
 * bypass YO'Q — barcha login real `/staff/auth/login` orqali.
 *
 * TOTP UI (bo'lim 6): admin frontendda enroll/verify sahifasi HALI YO'Q
 * (`lib/api/admin.ts`da `staffEnrollTotp`/`staffVerifyTotp` funksiyalari
 * bor, lekin ularni chaqiradigan UI komponent yo'q) — yangi UI qo'shish
 * "close gaps, don't add features" prinsipiga zid, shuning uchun bu
 * bo'lim SINALMAYDI (N/A, gap emas — hech qachon "implemented" deb
 * da'vo qilinmagan).
 */

test("TOTP: enroll -> verify -> enabled (N/A — UI mavjud emas)", async () => {
  /* DIQQAT — `test.skip(condition, reason)` FAYL DARAJASIDA (test()
     chaqiruvi TASHQARISIDA) chaqirilsa Playwright BUTUN FAYLDAGI barcha
     keyingi testlarni skip qiladi, faqat shu bittasini emas — bu Bosqich
     18'da aynan shu sababdan HAMMA 13 ta admin testi skip bo'lib chiqqan
     haqiqiy xato edi (mahsulot kodida emas, shu test faylida). To'g'ri
     ko'lam — `test.skip()`ni FAQAT shu test() callback'i ICHIDA chaqirish. */
  test.skip(
    true,
    "TOTP enroll/verify UI hali admin frontendda yo'q (lib/api/admin.ts'da staffEnrollTotp/staffVerifyTotp bor, " +
      "lekin ularni chaqiradigan sahifa/komponent yo'q). Yangi UI qo'shish 'close gaps, don't add features' " +
      "prinsipiga zid — bu hech qachon 'implemented' deb da'vo qilinmagan, shuning uchun bu gap emas.",
  );
});

let fixture: Awaited<ReturnType<typeof seedAdminTestData>>;

test.beforeAll(async () => {
  fixture = await seedAdminTestData();
});

test.describe.serial("Admin: SUPER_ADMIN — asosiy oqim va kritik ekranlar", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ context, page } = await newAdminPage(browser));
    await staffLogin(page, SUPER_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
    await expect(page).toHaveURL(new RegExp(`${ADMIN_BASE_URL}/admin$`));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("dashboard yuklanadi", async () => {
    await expect(page.getByText(/Boshqaruv/i).first()).toBeVisible();
  });

  test("foydalanuvchilar (sotuvchi holati bilan) ro'yxati yuklanadi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/foydalanuvchilar`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Foydalanuvchilar" })).toBeVisible();
    await expect(page.getByText(fixture.sellerPhone)).toBeVisible({ timeout: 8000 });
  });

  test("shartnomalar ro'yxati yuklanadi va yaratilgan shartnoma ko'rinadi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/shartnomalar`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Shartnomalar" })).toBeVisible();
    await expect(page.getByText(fixture.contractId.slice(0, 10))).toBeVisible({ timeout: 8000 });
  });

  test("to'lovlar sahifasi yuklanadi va SUCCEEDED to'lov ko'rinadi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tolovlar`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "To'lovlar, Qaytarish & Chiqarish" })).toBeVisible();
    await expect(page.getByText(fixture.paymentId.slice(0, 10)).first()).toBeVisible({ timeout: 8000 });
  });

  test("nizolar markazi yuklanadi va OCHIQ nizo ko'rinadi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/nizolar`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Nizolar markazi" })).toBeVisible();
    await expect(page.getByText(fixture.contractId.slice(0, 10)).first()).toBeVisible({ timeout: 8000 });
  });

  test("audit jurnali yuklanadi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/audit`, { waitUntil: "networkidle" });
    await expect(page.getByText(/[Aa]udit/).first()).toBeVisible();
  });

  test("xizmatlar (gated) — xatosiz, tushunarli ErrorState ko'rsatadi, ХАТО EMAS", async () => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    await page.goto(`${ADMIN_BASE_URL}/admin/xizmatlar`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    expect(pageErrors, "sahifa JS xatosiz render bo'lishi kerak (crash emas)").toEqual([]);
    // ErrorState "Qayta urinish" tugmasi bilan chiqadi — bo'sh oq ekran EMAS
    await expect(page.getByRole("button", { name: /[Qq]ayta urinish|[Rr]etry/i })).toBeVisible({ timeout: 5000 });
  });
});

test("moliyaviy xavfsizlik: to'lovlar sahifasida xavfli qo'lda-o'zgartirish tugmalari YO'Q", async ({ browser }) => {
  const { context, page } = await newAdminPage(browser);
  await staffLogin(page, SUPER_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
  await page.goto(`${ADMIN_BASE_URL}/admin/tolovlar`, { waitUntil: "networkidle" });

  const dangerousLabels = [
    /muvaffaqiyatli deb belgila/i,
    /ledgerni tahrirla/i,
    /balansni (qo'lda )?belgila/i,
    /chiqarishni muvaffaqiyatli/i,
    /outbox.*yetkazilgan deb belgila/i,
    /mark.*succeeded/i,
    /edit ledger/i,
  ];
  for (const label of dangerousLabels) {
    await expect(page.getByRole("button", { name: label }), `xavfli tugma topilmasligi kerak: ${label}`).toHaveCount(0);
  }
  // Sahifaning o'zi ham buni ochiq deydi (svg/description) — qo'shimcha tasdiq
  await expect(page.getByText(/qo'lda o'zgartirish tugmalari yo'q/i)).toBeVisible();

  await context.close();
});

test("refund yaratish — Idempotency-Key header yuboriladi (Bosqich 17 regressiyasi)", async ({ browser }) => {
  const { context, page } = await newAdminPage(browser);
  await staffLogin(page, SUPER_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
  await page.goto(`${ADMIN_BASE_URL}/admin/tolovlar`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Qaytarishlar" }).click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: /Qaytarish yaratish/i }).first().click();
  await page.waitForTimeout(300);
  await page.locator("input").first().fill(fixture.contractId);
  await page.locator("textarea").first().fill("Admin E2E — Idempotency-Key regressiya sinovi uchun qaytarish.");

  const [refundReq] = await Promise.all([
    page.waitForRequest((req) => req.url().includes("/staff/refunds") && req.method() === "POST"),
    page.getByRole("button", { name: "Qaytarish yaratish" }).last().click(),
  ]);
  expect(refundReq.headers()["idempotency-key"], "refund POST so'rovida Idempotency-Key header bo'lishi shart").toBeTruthy();

  await context.close();
});

test("nizoni hal qilish — Idempotency-Key header yuboriladi (Bosqich 17 regressiyasi)", async ({ browser }) => {
  const { context, page } = await newAdminPage(browser);
  await staffLogin(page, SUPER_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
  await page.goto(`${ADMIN_BASE_URL}/admin/nizolar`, { waitUntil: "networkidle" });
  const row = page.locator("tr", { hasText: fixture.contractId.slice(0, 10) });
  await row.getByRole("button", { name: "Ko'rib chiqish" }).click();
  await page.waitForTimeout(400);

  const startReviewBtn = page.getByRole("button", { name: "Ko'rib chiqishni boshlash" });
  if (await startReviewBtn.count()) {
    await startReviewBtn.click();
    await page.waitForTimeout(500);
  }

  await page.getByRole("button", { name: "To'liq xaridorga" }).click();
  await page.locator("textarea").first().fill("Admin E2E — nizo Idempotency-Key regressiya sinovi uchun hal qilindi.");

  const [resolveReq] = await Promise.all([
    page.waitForRequest((req) => req.url().includes("/resolve") && req.method() === "POST"),
    page.getByRole("button", { name: "Qarorni tasdiqlash" }).click(),
  ]);
  expect(resolveReq.headers()["idempotency-key"], "resolve POST so'rovida Idempotency-Key header bo'lishi shart").toBeTruthy();

  await context.close();
});

/**
 * DIQQAT — bu test `reset@e2e.test` parolini O'ZGARTIRADI (real UI oqimi,
 * shu narsani sinaydi). Qayta ishga tushirishdan OLDIN
 * `backend/scripts/e2e-staff-fixture.cjs` qayta ishga tushirilishi kerak
 * (u idempotent — email bo'yicha upsert, parolni asl test qiymatiga va
 * `mustChangePassword=true`ga qaytaradi) — RUNBOOK §18.
 */
test("mustChangePassword hard gate: temp parol → bloklangan sahifa → parol almashtirish → ruxsat tiklanadi", async ({
  browser,
}) => {
  const { context, page } = await newAdminPage(browser);

  await test.step("temp parol bilan kirish → parolni almashtirish sahifasiga majburiy yo'naltiriladi", async () => {
    await staffLogin(page, RESET_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "rahbariyat");
    await expect(page).toHaveURL(/parolni-almashtirish/, { timeout: 8000 });
  });

  await test.step("imtiyozli sahifaga to'g'ridan-to'g'ri o'tishga urinish — bloklanadi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/foydalanuvchilar`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/parolni-almashtirish/, { timeout: 5000 });
  });

  const newPassword = "E2eNewPass#2026x";
  await test.step("parolni almashtiradi", async () => {
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill(E2E_STAFF_PASSWORD);
    await inputs.nth(1).fill(newPassword);
    await inputs.nth(2).fill(newPassword);
    await page.getByRole("button", { name: /[Ss]aqlash|[Aa]lmashtirish/i }).click();
    await page.waitForTimeout(1000);
  });

  await test.step("imtiyozli kirish tiklangan — endi foydalanuvchilar sahifasi ochiladi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/foydalanuvchilar`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Foydalanuvchilar" })).toBeVisible({ timeout: 5000 });
  });

  await context.close();
});

test("ruxsat testi: cheklangan admin — frontend Access Denied VA backend 403 (UI ko'rinishi xavfsizlik manbai emas)", async ({
  browser,
}) => {
  const { context, page } = await newAdminPage(browser);
  await staffLogin(page, RESTRICTED_ADMIN_EMAIL, E2E_STAFF_PASSWORD, "admin");
  await expect(page).toHaveURL(new RegExp(`${ADMIN_BASE_URL}/admin$`), { timeout: 8000 });

  await test.step("frontend: bloklangan sahifaga o'tish -> Access Denied", async () => {
    await page.goto(`${ADMIN_BASE_URL}/admin/foydalanuvchilar`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/ruxsat-yoq/, { timeout: 5000 });
    await expect(page.getByText("403")).toBeVisible();
    await expect(page.getByText(/Ruxsat yetarli emas/i)).toBeVisible();
  });

  await test.step("backend: to'g'ridan-to'g'ri API chaqiruvi HAM 403 qaytaradi (frontend gate emas)", async () => {
    // `page.request` brauzerning xotiradagi Bearer token'ini AVTOMATIK
    // yubormaydi (faqat cookie'larni baham ko'radi) — shuning uchun avval
    // httpOnly `staff_refresh_token` cookie orqali yangi accessToken olamiz.
    const refreshRes = await page.request.post(`${ADMIN_API_BASE}/staff/auth/refresh`);
    const { accessToken } = (await refreshRes.json()) as { accessToken: string };
    const res = await page.request.get(`${ADMIN_API_BASE}/staff/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status(), "backend mustaqil ravishda 403 qaytarishi shart").toBe(403);
  });

  await context.close();
});
