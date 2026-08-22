import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// Slow down the network response so we have a real window to observe "submitting"
await page.route("**/api/support", async (route) => {
  await new Promise((r) => setTimeout(r, 800));
  await route.continue();
});

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
await submitBtn.click();
await page.waitForTimeout(200); // give React time to flush setPhase("submitting")
const disabledDuring = await submitBtn.isDisabled();
const spinnerDuring = await page.locator('button:has-text("Yuborish") svg.animate-spin').count();
const bodyDuring = await page.locator('[role="dialog"]').innerText();
console.log(JSON.stringify({ disabledDuring, spinnerDuring, showsSubmittingText: bodyDuring.includes("Yuborilmoqda") || spinnerDuring > 0 }));

await page.waitForTimeout(1200);
const bodyAfter = await page.locator('[role="dialog"]').innerText();
console.log("final state includes error:", bodyAfter.includes("Xabar yuborilmadi"));
await browser.close();
