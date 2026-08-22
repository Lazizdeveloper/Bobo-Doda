import { chromium } from "playwright";
const outDir = "/tmp/claude-1000/-home-saidkarim-Bobo-Doda/aef47ab8-2169-4023-967f-a126afc97c58/scratchpad";
const base = "http://127.0.0.1:3055";
const browser = await chromium.launch();
const results = [];
async function check(name, fn) {
  try { results.push({ name, ok: true, detail: await fn() }); }
  catch (e) { results.push({ name, ok: false, detail: String(e).slice(0, 300) }); }
}

const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto(base + "/savol-javob", { waitUntil: "networkidle" });
await page.screenshot({ path: `${outDir}/faq_page.png` });

await check("FAQ search filters results", async () => {
  const before = await page.locator(".rounded-card.border.border-line.bg-card").count();
  await page.fill('input[type="search"]', "escrow");
  await page.waitForTimeout(200);
  const after = await page.locator("button[aria-expanded]").count();
  return { before, after };
});

await check("FAQ category filter works", async () => {
  await page.fill('input[type="search"]', "");
  await page.click('button:has-text("Xavfsizlik")');
  await page.waitForTimeout(200);
  const count = await page.locator("button[aria-expanded]").count();
  return { count };
});

await check("FAQ accordion opens on click", async () => {
  await page.goto(base + "/savol-javob", { waitUntil: "networkidle" });
  const first = page.locator("button[aria-expanded]").first();
  await first.click();
  await page.waitForTimeout(400);
  const expanded = await first.getAttribute("aria-expanded");
  return { expanded };
});

await check("FAQ deep-link ?q=slug auto-opens item", async () => {
  await page.goto(base + "/savol-javob?q=escrow-qanday-ishlaydi", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const expanded = await page.locator("#faq-escrow-qanday-ishlaydi button[aria-expanded]").getAttribute("aria-expanded");
  return { expanded };
});

await check("FAQ 'Yordam so'rash' opens Support Modal", async () => {
  await page.goto(base + "/savol-javob", { waitUntil: "networkidle" });
  await page.click('button:has-text("Yordam so\'rash")');
  await page.waitForTimeout(300);
  const visible = await page.locator('[role="dialog"]').isVisible();
  return { visible };
});

await page.goto(base + "/yordam-markazi", { waitUntil: "networkidle" });
await page.screenshot({ path: `${outDir}/hc_page.png` });

await check("Help Center search filters articles", async () => {
  await page.fill('input[type="search"]', "karta");
  await page.waitForTimeout(200);
  const links = await page.locator('a[href^="/yordam-markazi/"]').count();
  return { links };
});

await check("Help Center article page loads with real content", async () => {
  await page.goto(base + "/yordam-markazi/escrow-qanday-ishlaydi", { waitUntil: "networkidle" });
  const h1 = await page.locator("h1").innerText();
  const paragraphCount = await page.locator("main p").count();
  await page.screenshot({ path: `${outDir}/hc_article.png` });
  return { h1, paragraphCount };
});

await check("Help Center related articles link to real slugs", async () => {
  const relatedLinks = await page.locator('a[href^="/yordam-markazi/"]').all();
  const hrefs = await Promise.all(relatedLinks.map((l) => l.getAttribute("href")));
  await relatedLinks[0]?.click();
  await page.waitForTimeout(600);
  return { hrefs: hrefs.slice(0, 5), landedUrl: page.url() };
});

await check("Help Center article 'Yordam so'rash' passes article route context", async () => {
  await page.goto(base + "/yordam-markazi/nizolarni-hal-qilish", { waitUntil: "networkidle" });
  await page.click('button:has-text("Yordam so\'rash")');
  await page.waitForTimeout(300);
  const visible = await page.locator('[role="dialog"]').isVisible();
  return { visible };
});

await check("Invalid article slug shows empty state, not a crash", async () => {
  await page.goto(base + "/yordam-markazi/this-does-not-exist", { waitUntil: "networkidle" });
  const bodyText = await page.locator("main").innerText();
  return { hasContent: bodyText.length > 0, status: "ok" };
});

const sw = await page.evaluate(() => document.documentElement.scrollWidth);
const cw = await page.evaluate(() => document.documentElement.clientWidth);
console.log(JSON.stringify(results, null, 2));
console.log("overflow:", sw > cw, "consoleErrs:", JSON.stringify(errs));
await page.close();
await browser.close();
