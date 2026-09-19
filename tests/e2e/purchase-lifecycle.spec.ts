import { test, expect } from "@playwright/test";
import { loginBuyer, setupApprovedSeller, signAndSendTestWebhook } from "./helpers";

/**
 * Yagona, eng muhim oqim: xarid -> qabul -> to'lov -> bosqich topshirish ->
 * qabul -> shartnoma yakunlanishi. Ikki aktyor (xaridor + sotuvchi) bir
 * vaqtda kerak bo'lgani uchun ikkalasi ham o'z BROWSER CONTEXT'ida (o'z
 * jonli login sessiyasi bilan) ochiladi — `storageState` fayl orqali EMAS
 * (`tests/e2e/helpers.ts`dagi izohga qarang — refresh token bir martalik).
 *
 * Bu test aynan Bosqich 17'da tirik brauzer orqali topilgan IKKI haqiqiy
 * xatoni regressiyadan himoya qiladi:
 *  1. Xaridorning "To'lash" tugmasi HAR safar faol+mablag'lanmagan
 *     kontraktni ochganda ~2 daqiqaga yashiringan edi (polling holati
 *     noto'g'ri "processing" bilan boshlangani sabab) — endi darhol ko'rinishi
 *     kerak.
 *  2. Sotuvchi HECH QACHON "mablag'langan" holatini ko'rmasdi (funded/
 *     fundedAt xaritalash xatosi) — real to'lovdan keyin ko'rishi kerak.
 */
test("xarid -> qabul -> to'lov -> topshirish -> qabul -> yakunlanish", async ({ browser }) => {
  const buyer = await loginBuyer(browser);
  const seller = await setupApprovedSeller(browser);
  const { page: buyerPage } = buyer;
  const { page: sellerPage } = seller;

  await test.step("xaridor xizmatni xarid qiladi", async () => {
    await buyerPage.goto(`/xaridor/bozor/xizmat/${seller.serviceId}`, { waitUntil: "networkidle" });
    await buyerPage.getByRole("button", { name: /Buyurtma/i }).first().click();
    await buyerPage.waitForTimeout(400);
    await buyerPage.getByRole("button", { name: /Shartnoma yaratish/i }).last().click();
    await buyerPage.waitForURL("**/xaridor/shartnomalar/*", { timeout: 15_000 });
  });

  const contractId = new URL(buyerPage.url()).pathname.split("/").pop()!;

  await test.step("sotuvchi shartnomani qabul qiladi", async () => {
    await sellerPage.goto(`/mutaxassis/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await sellerPage.getByRole("button", { name: "Qabul qilish" }).click({ timeout: 8000 });
    await expect(sellerPage.getByText(/Faol/i).first()).toBeVisible({ timeout: 8000 });
  });

  await test.step("xaridor 'To'lash' tugmasini DARHOL ko'radi (regressiya: avval ~2daq yashirin edi)", async () => {
    await buyerPage.goto(`/xaridor/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await expect(buyerPage.getByRole("button", { name: /To'lash/i })).toBeVisible({ timeout: 5000 });
  });

  let paymentId = "";
  await test.step("xaridor to'lovni boshlaydi", async () => {
    const [paymentRes] = await Promise.all([
      buyerPage.waitForResponse((res) => res.url().includes("/payment") && res.request().method() === "POST"),
      buyerPage.getByRole("button", { name: /To'lash/i }).click(),
    ]);
    const body = (await paymentRes.json()) as { id: string };
    paymentId = body.id;
    expect(paymentId, "to'lov ID qaytishi kerak").toBeTruthy();
  });

  await test.step("TEST provider webhook — to'lov SUCCEEDED deb belgilanadi", async () => {
    await signAndSendTestWebhook({ paymentId, amountTiyin: 90_000_000 });
  });

  await test.step("sotuvchi 'mablag'langan' holatini ko'radi (regressiya: avval hech qachon ko'rinmasdi)", async () => {
    await sellerPage.goto(`/mutaxassis/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await expect(sellerPage.getByText(/Mablag'langan|TO'LOV KAFOLATLANGAN/i).first()).toBeVisible({ timeout: 8000 });
  });

  await test.step("sotuvchi ishni topshiradi", async () => {
    await sellerPage.getByRole("button", { name: /Topshirish/i }).first().click({ timeout: 8000 });
    await sellerPage.waitForTimeout(300);
    const linkInput = sellerPage.locator('input[placeholder*="http" i]').first();
    if (await linkInput.count()) await linkInput.fill("https://example.com/deliverable.pdf");
    const noteArea = sellerPage.locator("textarea").first();
    if (await noteArea.count()) await noteArea.fill("Ish tayyor, ko'rib chiqing.");
    await sellerPage.getByRole("button", { name: "Ish topshirildi" }).click();
    await expect(sellerPage.getByText(/[Tt]opshirildi/).first()).toBeVisible({ timeout: 5000 });
  });

  await test.step("xaridor bosqichni qabul qiladi va shartnoma yakunlanadi", async () => {
    await buyerPage.goto(`/xaridor/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await buyerPage.getByRole("button", { name: "Qabul qilish" }).first().click({ timeout: 8000 });
    await buyerPage.waitForTimeout(300);
    const confirmBtn = buyerPage.getByRole("button", { name: "Qabul qilish" }).last();
    if (await confirmBtn.count()) await confirmBtn.click().catch(() => {});
    await expect(buyerPage.getByText(/Yakunlangan/i).first()).toBeVisible({ timeout: 8000 });
  });

  await buyer.context.close();
  await seller.context.close();
});
