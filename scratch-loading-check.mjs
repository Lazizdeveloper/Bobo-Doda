import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:3055/", { waitUntil: "networkidle" });
await page.click(".nav-help-btn");
await page.waitForTimeout(300);
await page.selectOption("select", "loyiha");
await page.fill("textarea", "Bu yetarlicha uzun test xabari yuklanish holatini tekshirish uchun.");
const inputs = await page.locator("input").all();
if (inputs.length >= 2) {
  await inputs[0].fill("Test Guest");
  await inputs[1].fill("@testguest");
}

const submitBtn = page.locator('button:has-text("Yuborish")');
// Race: click and immediately check disabled + spinner presence
const [, disabledDuring, spinnerDuring] = await Promise.all([
  submitBtn.click(),
  submitBtn.isDisabled(),
  page.locator('button:has-text("Yuborish") svg.animate-spin').count(),
]);
console.log(JSON.stringify({ disabledDuring, spinnerDuring }));

// double-click immediately after (simulate impatient user) -- should be no-op since disabled
await submitBtn.click({ force: true }).catch(() => {});
await page.waitForTimeout(1500);
const bodyText = await page.locator('[role="dialog"]').innerText();
console.log("final state includes error:", bodyText.includes("Xabar yuborilmadi"));
await browser.close();
