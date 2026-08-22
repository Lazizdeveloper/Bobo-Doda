import { chromium } from "playwright";
const outDir = "/tmp/claude-1000/-home-saidkarim-Bobo-Doda/aef47ab8-2169-4023-967f-a126afc97c58/scratchpad";
const base = "http://127.0.0.1:3055";
const browser = await chromium.launch();
const results = [];

async function check(name, fn) {
  try {
    const r = await fn();
    results.push({ name, ok: true, detail: r });
  } catch (e) {
    results.push({ name, ok: false, detail: String(e).slice(0, 300) });
  }
}

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrs = [];
page.on("pageerror", (e) => consoleErrs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) consoleErrs.push(m.text()); });

// 1. Navbar help icon opens modal
await check("Navbar help icon opens Support Modal", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.click(".nav-help-btn");
  await page.waitForTimeout(300);
  const visible = await page.locator('[role="dialog"]').isVisible();
  await page.screenshot({ path: `${outDir}/sm_open.png` });
  return { visible };
});

// 2. ESC closes
await check("ESC closes modal", async () => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const count = await page.locator('[role="dialog"]').count();
  return { dialogCountAfterEsc: count };
});

// 3. Validation: empty submit shows errors
await check("Empty submit shows validation errors", async () => {
  await page.click(".nav-help-btn");
  await page.waitForTimeout(300);
  await page.click('button:has-text("Yuborish")');
  await page.waitForTimeout(200);
  const errCount = await page.locator('[role="alert"]').count();
  return { errCount };
});

// 4. Fill category + short message -> min length error
await check("Short message shows min-length error", async () => {
  await page.selectOption("select", "loyiha");
  await page.fill("textarea", "short");
  await page.fill('input[id]:below(label:has-text("Ism"))', "Test Guest").catch(() => {});
  const nameInputs = await page.locator("input").all();
  if (nameInputs.length >= 2) {
    await nameInputs[0].fill("Test Guest");
    await nameInputs[1].fill("@testguest");
  }
  await page.click('button:has-text("Yuborish")');
  await page.waitForTimeout(200);
  const bodyText = await page.locator('[role="dialog"]').innerText();
  return { hasMinLenError: bodyText.includes("10 belgi") };
});

// 5. Valid submit -> loading -> honest error (no real Telegram creds configured)
await check("Valid submit shows honest error state (no fake success)", async () => {
  await page.fill("textarea", "Bu yetarlicha uzun test xabari support tizimini sinash uchun yozilmoqda.");
  const submitBtn = page.locator('button:has-text("Yuborish")');
  await submitBtn.click();
  await page.waitForTimeout(150);
  const duringSubmitDisabled = await submitBtn.isDisabled().catch(() => null);
  await page.waitForTimeout(1200);
  const bodyText = await page.locator('[role="dialog"]').innerText();
  await page.screenshot({ path: `${outDir}/sm_error_state.png` });
  return {
    duringSubmitDisabled,
    showsErrorTitle: bodyText.includes("Xabar yuborilmadi"),
    hasRetryButton: bodyText.includes("Qayta urinish"),
  };
});

// 6. Retry goes back to form with data intact
await check("Retry returns to form with message intact", async () => {
  await page.click('button:has-text("Qayta urinish")');
  await page.waitForTimeout(200);
  const textareaValue = await page.locator("textarea").inputValue();
  return { messagePreserved: textareaValue.includes("test xabari") };
});

await check("Close modal via backdrop/X works", async () => {
  await page.click('button[aria-label="Yopish"]');
  await page.waitForTimeout(300);
  const count = await page.locator('[role="dialog"]').count();
  return { dialogCountAfterClose: count };
});

// 7. Footer "Biz bilan bog'lanish" opens modal
await check("Footer contact button opens Support Modal", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.locator("footer.footer").scrollIntoViewIfNeeded();
  await page.click('footer button:has-text("bog\'lanish")');
  await page.waitForTimeout(300);
  const visible = await page.locator('[role="dialog"]').isVisible();
  return { visible };
});

// 8. Footer FAQ + Help Center links navigate to real pages
await check("Footer Savol-javob -> /savol-javob", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.locator("footer.footer").scrollIntoViewIfNeeded();
  await page.click('footer a[href="/savol-javob"]');
  await page.waitForTimeout(800);
  return { url: page.url() };
});
await check("Footer Yordam markazi -> /yordam-markazi", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.locator("footer.footer").scrollIntoViewIfNeeded();
  await page.click('footer a[href="/yordam-markazi"]');
  await page.waitForTimeout(800);
  return { url: page.url() };
});

await page.close();
await browser.close();
console.log(JSON.stringify(results, null, 2));
console.log("CONSOLE_ERRS:", JSON.stringify(consoleErrs));
