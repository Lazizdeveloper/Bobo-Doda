import { test, expect } from "@playwright/test";
import { loginBuyer, setupApprovedSeller, signAndSendTestWebhook } from "./helpers";

/**
 * Nizo ochish/ko'rish/qaytarib olish oqimi. Bu test Bosqich 17'da topilgan
 * UCHINCHI real xatoni regressiyadan himoya qiladi: `disputesService.open()`
 * `Idempotency-Key` header'ini yubormasdi — backend BUNI MAJBURIY talab
 * qiladi (`IDEMPOTENCY_KEY_REQUIRED`, 422) — ya'ni nizo ochish HAR DOIM
 * muvaffaqiyatsiz bo'lardi, har bir foydalanuvchi uchun.
 */
test("xaridor nizo ochadi, sotuvchi ko'radi, xaridor qaytarib oladi", async ({ browser }) => {
  const buyer = await loginBuyer(browser);
  const seller = await setupApprovedSeller(browser);
  const { page: buyerPage } = buyer;
  const { page: sellerPage } = seller;

  let contractId = "";
  await test.step("xaridor xarid qiladi, sotuvchi qabul qiladi, to'lov muvaffaqiyatli bo'ladi", async () => {
    await buyerPage.goto(`/xaridor/bozor/xizmat/${seller.serviceId}`, { waitUntil: "networkidle" });
    await buyerPage.getByRole("button", { name: /Buyurtma/i }).first().click();
    await buyerPage.waitForTimeout(400);
    await buyerPage.getByRole("button", { name: /Shartnoma yaratish/i }).last().click();
    await buyerPage.waitForURL("**/xaridor/shartnomalar/*", { timeout: 15_000 });
    contractId = new URL(buyerPage.url()).pathname.split("/").pop()!;

    await sellerPage.goto(`/mutaxassis/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await sellerPage.getByRole("button", { name: "Qabul qilish" }).click({ timeout: 8000 });

    await buyerPage.goto(`/xaridor/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    const [paymentRes] = await Promise.all([
      buyerPage.waitForResponse((res) => res.url().includes("/payment") && res.request().method() === "POST"),
      buyerPage.getByRole("button", { name: /To'lash/i }).click(),
    ]);
    const { id: paymentId } = (await paymentRes.json()) as { id: string };
    await signAndSendTestWebhook({ paymentId, amountTiyin: 90_000_000 });
  });

  await test.step("xaridor nizo ochadi", async () => {
    await buyerPage.goto(`/xaridor/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await buyerPage.getByRole("button", { name: "Nizo ochish" }).click({ timeout: 8000 });
    await buyerPage.waitForTimeout(300);
    await buyerPage
      .locator("textarea")
      .first()
      .fill("Ish muddatida topshirilmadi va spetsifikatsiyaga mos kelmadi, aniqlashtirish kerak.");
    await buyerPage.getByRole("button", { name: "Nizoni ochish" }).click();
    await expect(buyerPage.getByText("Nizo tafsilotlari")).toBeVisible({ timeout: 5000 });
  });

  await test.step("sotuvchi nizoni shartnoma sahifasida ko'radi", async () => {
    await sellerPage.goto(`/mutaxassis/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await expect(sellerPage.getByText(/[Nn]izo/).first()).toBeVisible({ timeout: 5000 });
  });

  await test.step("xaridor nizoni qaytarib oladi", async () => {
    await buyerPage.goto(`/xaridor/shartnomalar/${contractId}`, { waitUntil: "networkidle" });
    await buyerPage.getByRole("button", { name: /Nizoni qaytarib olish/i }).click({ timeout: 8000 });
    await buyerPage.waitForTimeout(300);
    const confirmBtn = buyerPage.getByRole("button", { name: /Nizoni qaytarib olish/i }).last();
    if (await confirmBtn.count()) await confirmBtn.click().catch(() => {});
    await expect(buyerPage.getByRole("button", { name: "Nizo ochish" })).toBeVisible({ timeout: 5000 });
  });

  await buyer.context.close();
  await seller.context.close();
});
