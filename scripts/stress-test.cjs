/**
 * ESKIRGAN — Bosqich 17 (real backend integratsiyasi)dan beri BUZILGAN.
 * Sabab va o'rnini bosuvchi — `scripts/lifecycle-test.cjs` boshidagi izohga
 * qarang (`npm run test:e2e:live`, `tests/e2e/`, RUNBOOK §14).
 */
const { chromium } = require("playwright");

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const MAX_PAGES = Number(process.env.TEST_MAX_PAGES || 90);

const roles = {
  buyer: {
    base: "/xaridor",
    routes: [
      "/xaridor",
      "/xaridor/bozor",
      "/xaridor/bozor/xizmat/svc-1",
      "/xaridor/bozor/mutaxassis/u-1",
      "/xaridor/elonlarim",
      "/xaridor/elonlarim/job-1",
      "/xaridor/elonlarim/yangi",
      "/xaridor/shartnomalar",
      "/xaridor/shartnomalar/cnt-5",
      "/xaridor/takliflarim",
      "/xaridor/xabarlar",
      "/xaridor/xarajatlar",
      "/xaridor/sozlamalar",
      "/xaridor/verifikatsiya",
      "/xaridor/yordam",
    ],
    session: {
      userId: "u-b2",
      role: "xaridor",
      profileDone: false,
      verified: true,
    },
  },
  seller: {
    base: "/mutaxassis",
    routes: [
      "/mutaxassis",
      "/mutaxassis/ish-elonlari",
      "/mutaxassis/ish-elonlari/job-1",
      "/mutaxassis/takliflarim",
      "/mutaxassis/takliflarim/kelgan/off-1",
      "/mutaxassis/shartnomalar",
      "/mutaxassis/shartnomalar/cnt-1",
      "/mutaxassis/xabarlar",
      "/mutaxassis/xizmatlarim",
      "/mutaxassis/xizmatlarim/svc-1",
      "/mutaxassis/xizmatlarim/yangi",
      "/mutaxassis/profil",
      "/mutaxassis/daromad",
      "/mutaxassis/sozlamalar",
      "/mutaxassis/verifikatsiya",
      "/mutaxassis/yordam",
    ],
    session: {
      userId: "u-1",
      role: "mutaxassis",
      profileDone: true,
      verified: true,
    },
  },
};

function localPath(href) {
  try {
    const url = new URL(href, BASE);
    if (url.origin !== new URL(BASE).origin) return null;
    if (
      url.pathname.startsWith("/_next") ||
      url.pathname.startsWith("/landing.html")
    ) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function seedSession(page, session) {
  await page.goto(`${BASE}/kirish`, { waitUntil: "networkidle" });
  await page.evaluate((value) => {
    localStorage.setItem("sb_session", JSON.stringify(value));
  }, session);
}

async function crawlRole(browser, roleName, config) {
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    locale: "uz-UZ",
  });
  const page = await context.newPage();
  const failures = [];
  const warnings = [];

  page.on("pageerror", (error) =>
    failures.push(`${page.url()} PAGEERROR ${error.message}`)
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push(`${page.url()} CONSOLE ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(
        `${page.url()} HTTP ${response.status()} ${response.url()}`
      );
    }
  });

  await seedSession(page, config.session);
  // Explicit manifests prevent a hidden/collapsed navigation from silently
  // reducing coverage to the dashboard root.
  const queue = [...config.routes];
  const seen = new Set();

  while (queue.length && seen.size < MAX_PAGES) {
    const path = queue.shift();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 20_000,
    });
    if (!response || response.status() >= 400) {
      failures.push(`${path} navigation status ${response?.status()}`);
      continue;
    }
    await page.waitForTimeout(350);

    const diagnostics = await page.evaluate(() => {
      const body = document.body;
      const unlabeled = [...document.querySelectorAll("button")]
        .filter(
          (button) =>
            !button.textContent?.trim() &&
            !button.getAttribute("aria-label") &&
            !button.getAttribute("title")
        )
        .length;
      const invalidLinks = [...document.querySelectorAll("a[href]")]
        .map((anchor) => anchor.getAttribute("href"))
        .filter((href) => href === "#" || href === "");
      return {
        title: document.title,
        htmlLang: document.documentElement.lang,
        overflow: body.scrollWidth - window.innerWidth,
        unlabeled,
        invalidLinks,
        untranslated: body.innerText
          .split(/\s+/)
          .filter((token) => /^[a-z]+(\.[a-zA-Z_]+)+$/.test(token))
          .slice(0, 20),
      };
    });

    if (diagnostics.overflow > 2) {
      failures.push(`${path} horizontal overflow ${diagnostics.overflow}px`);
    }
    if (diagnostics.unlabeled) {
      failures.push(`${path} ${diagnostics.unlabeled} unlabeled buttons`);
    }
    if (diagnostics.invalidLinks.length) {
      failures.push(`${path} empty/hash links`);
    }
    if (diagnostics.htmlLang !== "uz") {
      warnings.push(`${path} html lang=${diagnostics.htmlLang}`);
    }
    if (diagnostics.untranslated.length) {
      warnings.push(
        `${path} possible untranslated: ${diagnostics.untranslated.join(",")}`
      );
    }

    const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.href)
    );
    for (const href of hrefs) {
      const next = localPath(href);
      if (
        next &&
        (next.startsWith(config.base) ||
          ["/shartlar", "/maxfiylik", "/oferta"].includes(next)) &&
        !seen.has(next)
      ) {
        queue.push(next);
      }
    }
  }

  await context.close();
  return { roleName, pages: [...seen], failures, warnings };
}

async function mobileSmoke(browser, roleName, config) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await seedSession(page, config.session);
  for (const path of [
    config.base,
    `${config.base}/sozlamalar`,
    `${config.base}/verifikatsiya`,
    `${config.base}/yordam`,
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(
      () => document.body.scrollWidth - window.innerWidth
    );
    if (overflow > 2) failures.push(`${path} mobile overflow ${overflow}px`);
    const menu = page.getByRole("button", { name: /menyu|menu/i }).first();
    if (await menu.isVisible()) {
      await menu.click();
      const dialog = page.getByRole("dialog");
      if (!(await dialog.isVisible())) failures.push(`${path} drawer did not open`);
      await page.keyboard.press("Escape");
    }
  }
  await context.close();
  return { roleName, failures };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    /* Konteyner/CI muhitida (Docker, GitHub Actions) Chromium'ning user
       namespace sandbox'i mavjud emas va sahifa "Page crashed" bilan
       yiqiladi; /dev/shm ham ko'pincha kichik. Bu ikki bayroqsiz suite
       lokalda ishlab, CI'da ishlamaydi. */
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const crawl = [];
  const mobile = [];
  for (const [name, config] of Object.entries(roles)) {
    crawl.push(await crawlRole(browser, name, config));
    mobile.push(await mobileSmoke(browser, name, config));
  }
  await browser.close();

  const result = { base: BASE, crawl, mobile };
  console.log(JSON.stringify(result, null, 2));
  const failureCount =
    crawl.reduce((sum, item) => sum + item.failures.length, 0) +
    mobile.reduce((sum, item) => sum + item.failures.length, 0);
  process.exitCode = failureCount ? 1 : 0;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
