import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { freshPhone, registerViaUi, chooseRole } from "./helpers";
import { ADMIN_BASE_URL, ADMIN_API_BASE, E2E_STAFF_PASSWORD, SUPER_ADMIN_EMAIL, latestOtpFor } from "./admin-helpers";

/**
 * Bosqich 23 — `/mutaxassis/royxat` to'liq real-holat auditi (409 bug'idan
 * keyin). Izolyatsiyalangan admin E2E stack'ida ishlaydi (`:3010`/`:4010`)
 * — sabab: admin tasdiqlash/rad etish qadami kerak, va loyihaning
 * o'rnatilgan siyosati (RUNBOOK §18) staff/admin login FAQAT shu stack'da
 * — asosiy dev/prod staff hisobiga HECH QACHON tegilmaydi.
 *
 * Sotuvchining O'ZI — ro'yxatdan o'tish, forma, "ko'rib chiqilmoqda"/
 * "tasdiqlangan"/"rad etilgan" holatlari — 100% HAQIQIY brauzer UI orqali,
 * haqiqiy backend/Postgres/Redis/sessiya bilan. Mock POST muvaffaqiyati,
 * soxta sotuvchi holati yoki frontend fixture YO'Q.
 *
 * Admin qarori (approve/reject) esa to'g'ridan-to'g'ri REAL
 * `/staff/auth/login` + `/staff/seller-applications/:id/{approve,reject}`
 * orqali, brauzersiz — `seedAdminTestData()`dagi bilan bir xil falsafa
 * (bo'lim 19 — "admin transition setup" uchun ruxsat etilgan qisqa yo'l).
 */

async function getStaffToken(): Promise<string> {
  const res = await fetch(`${ADMIN_API_BASE}/staff/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: SUPER_ADMIN_EMAIL, password: E2E_STAFF_PASSWORD }),
  });
  const body = (await res.json()) as { accessToken?: string };
  if (!body.accessToken) throw new Error(`staff login failed: ${res.status} ${JSON.stringify(body)}`);
  return body.accessToken;
}

async function staffReject(token: string, applicationId: string, reason: string): Promise<void> {
  const res = await fetch(`${ADMIN_API_BASE}/staff/seller-applications/${applicationId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  });
  if (res.status !== 200) throw new Error(`reject failed: ${res.status} ${await res.text()}`);
}

async function staffApprove(token: string, applicationId: string): Promise<void> {
  const res = await fetch(`${ADMIN_API_BASE}/staff/seller-applications/${applicationId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) throw new Error(`approve failed: ${res.status} ${await res.text()}`);
}

/** Sotuvchining O'Z joriy arizasini (id) sessiyasi orqali o'qiydi —
    `page.request` httpOnly refresh cookie'ni ulashadi (`setupApprovedSeller`
    bilan bir xil naqsh, `RUNBOOK` §18). */
async function getMyApplication(page: Page): Promise<{ id: string; status: string }> {
  const refreshRes = await page.request.post(`${ADMIN_API_BASE}/auth/refresh`);
  const { accessToken } = (await refreshRes.json()) as { accessToken: string };
  const res = await page.request.get(`${ADMIN_API_BASE}/me/seller-application`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return (await res.json()) as { id: string; status: string };
}

test.describe.serial("Sotuvchi arizasi — to'liq real-holat oqimi (/mutaxassis/royxat)", () => {
  let context: BrowserContext;
  let page: Page;
  let staleTab: Page;
  const phone = freshPhone();

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("1) yangi foydalanuvchi: ro'yxatdan o'tish → Mutaxassis roli → /royxat forma ko'rinadi", async () => {
    await registerViaUi(page, phone, { baseUrl: ADMIN_BASE_URL, getCode: latestOtpFor });
    await chooseRole(page, "Mutaxassis");
    await page.waitForURL((url) => url.pathname.includes("/mutaxassis/royxat"), { timeout: 10_000 });
    await expect(page.getByLabel("Rasmiy F.I.Sh (hujjat bo'yicha)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Arizani yuborish" })).toBeVisible();
  });

  test("2) barcha majburiy maydonlar to'ldirilib yuborilsa → 'Arizangiz ko'rib chiqilmoqda' (navigatsiyasiz)", async () => {
    // Bo'lim 11 — ikkinchi tab HALI eski (bo'sh) forma bilan ochiq bo'ladi,
    // keyingi testda shu tab orqali "stale form" poyga holatini sinaymiz.
    staleTab = await context.newPage();
    await staleTab.goto(`${ADMIN_BASE_URL}/mutaxassis/royxat`, { waitUntil: "networkidle" });
    await expect(staleTab.getByRole("button", { name: "Arizani yuborish" })).toBeVisible();

    await page.getByLabel("To'liq ism").fill("Alisher Nematov");
    await page.getByLabel("Rasmiy F.I.Sh (hujjat bo'yicha)").fill("Alisher Nematovich Nematov");
    await page.getByLabel("Bozorda ko'rinadigan nom").fill("AN Dizayn Studiyasi");
    await page
      .getByLabel("O'zingiz haqingizda")
      .fill("10 yildan ortiq tajribaga ega grafik dizayner va UI/UX mutaxassisiman.");
    await page.getByRole("button", { name: "Arizani yuborish" }).click();

    await expect(page.getByText("Arizangiz ko'rib chiqilmoqda")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Arizani yuborish" })).toHaveCount(0);
  });

  test("3) sahifa yangilansa (refresh) → hamon PENDING, bo'sh forma QAYTIB KELMAYDI", async () => {
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("Arizangiz ko'rib chiqilmoqda")).toBeVisible();
    await expect(page.getByLabel("Rasmiy F.I.Sh (hujjat bo'yicha)")).toHaveCount(0);
  });

  test("4) ko'p-tab poyga: eski (bo'sh) forma bilan qayta yuborish → xom 409 EMAS, tushunarli xabar + o'z-o'zini davolash", async () => {
    await staleTab.getByLabel("To'liq ism").fill("Alisher Nematov");
    await staleTab.getByLabel("Rasmiy F.I.Sh (hujjat bo'yicha)").fill("Alisher Nematovich Nematov");
    await staleTab.getByLabel("Bozorda ko'rinadigan nom").fill("AN Dizayn Studiyasi (eski tab)");
    await staleTab
      .getByLabel("O'zingiz haqingizda")
      .fill("10 yildan ortiq tajribaga ega grafik dizayner va UI/UX mutaxassisiman.");
    await staleTab.getByRole("button", { name: "Arizani yuborish" }).click();

    // Foydalanuvchiga xom "Request failed"/"409 Conflict" EMAS, tushunarli xabar.
    // (`role="alert"` sahifada IKKITA: Toast va Next.js'ning o'z
    // `__next-route-announcer__`i — matn bo'yicha aniq ajratamiz.)
    await expect(staleTab.getByRole("alert").filter({ hasText: "Arizangiz allaqachon yuborilgan." })).toBeVisible({
      timeout: 10_000,
    });
    await expect(staleTab.getByText(/Request failed|409 Conflict/i)).toHaveCount(0);

    // Xato'dan keyin sahifa o'zini haqiqiy holatga (PENDING) moslab qayta chizadi.
    await expect(staleTab.getByText("Arizangiz ko'rib chiqilmoqda")).toBeVisible({ timeout: 10_000 });
    await staleTab.close();
  });

  test("5) admin rad etadi → foydalanuvchi REJECTED holatini ko'radi, sababi bilan", async () => {
    const myApp = await getMyApplication(page);
    expect(myApp.status).toBe("PENDING");
    const staff = await getStaffToken();
    await staffReject(staff, myApp.id, "Hujjatlar aniq emas, qaytadan yuklang");

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("Arizangiz rad etildi")).toBeVisible();
    await expect(page.getByText("Hujjatlar aniq emas, qaytadan yuklang")).toBeVisible();
    await expect(page.getByRole("button", { name: "Qayta ariza topshirish" })).toBeVisible();
  });

  test("6) qayta ariza — avvalgi qiymatlar oldindan to'ldirilgan, yuborilsa YANGI PENDING ariza", async () => {
    // Bo'lim 7/12 — qulaylik uchun oldindan to'ldirish: eski (rad etilgan)
    // arizadagi qiymatlar forma maydonlarida allaqachon bor.
    await expect(page.getByLabel("Rasmiy F.I.Sh (hujjat bo'yicha)")).toHaveValue("Alisher Nematovich Nematov");
    await expect(page.getByLabel("Bozorda ko'rinadigan nom")).toHaveValue("AN Dizayn Studiyasi");

    await page.getByLabel("Rasmiy F.I.Sh (hujjat bo'yicha)").fill("Alisher N. Nematov");
    await page.getByRole("button", { name: "Qayta ariza topshirish" }).click();

    await expect(page.getByText("Arizangiz ko'rib chiqilmoqda")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Arizangiz rad etildi")).toHaveCount(0);
  });

  test("7) admin tasdiqlaydi → foydalanuvchi APPROVED holatini ko'radi, dashboard CTA ishlaydi", async () => {
    const myApp = await getMyApplication(page);
    expect(myApp.status).toBe("PENDING");
    const staff = await getStaffToken();
    await staffApprove(staff, myApp.id);

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("Arizangiz tasdiqlangan")).toBeVisible();
    await page.getByRole("button", { name: "Boshqaruv paneliga o'tish" }).click();
    await page.waitForURL((url) => url.pathname === "/mutaxassis", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Boshqaruv" })).toBeVisible();
  });

  test("8) allaqachon TASDIQLANGAN sotuvchi — /royxat qayta ochilsa forma YO'Q, yangi ariza yubora olmaydi", async () => {
    await page.goto(`${ADMIN_BASE_URL}/mutaxassis/royxat`, { waitUntil: "networkidle" });
    await expect(page.getByText("Arizangiz tasdiqlangan")).toBeVisible();
    await expect(page.getByLabel("Rasmiy F.I.Sh (hujjat bo'yicha)")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Arizani yuborish" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Qayta ariza topshirish" })).toHaveCount(0);
  });
});
