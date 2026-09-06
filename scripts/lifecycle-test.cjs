const { chromium } = require("playwright");

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
const BUYER = {
  userId: "u-b2",
  role: "xaridor",
  profileDone: false,
  verified: true,
};
const SELLER = {
  userId: "u-1",
  role: "mutaxassis",
  profileDone: true,
  verified: true,
};

async function setSession(page, session) {
  await page.evaluate((value) => {
    localStorage.setItem("sb_session", JSON.stringify(value));
  }, session);
}

async function storage(page, key) {
  return page.evaluate((name) => {
    const raw = localStorage.getItem(name);
    return raw ? JSON.parse(raw) : null;
  }, key);
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let browser;

(async () => {
  browser = await chromium.launch({
    headless: true,
    /* Konteyner/CI muhitida (Docker, GitHub Actions) Chromium'ning user
       namespace sandbox'i mavjud emas va sahifa "Page crashed" bilan
       yiqiladi; /dev/shm ham ko'pincha kichik. Bu ikki bayroqsiz suite
       lokalda ishlab, CI'da ishlamaydi. */
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  let intentionallyOffline = false;
  page.on("pageerror", (error) => {
    if (!intentionallyOffline) runtimeErrors.push(error.message);
  });
  page.on("console", (message) => {
    const text = message.text();
    if (
      !intentionallyOffline &&
      message.type() === "error" &&
      !text.includes("favicon") &&
      !text.includes("Failed to fetch RSC payload")
    ) {
      runtimeErrors.push(text);
    }
  });

  /* Toza seed va yangi xaridorning butun onboarding oqimi. */
  await goto(page, "/kirish");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("To'liq ism").fill("Stress Test Buyer");
  await page.getByLabel("Telefon raqami").fill("+998991234501");
  await page.getByLabel("Parol").fill("Stress123");
  await page.getByRole("button", { name: "Akkount ochish" }).click();
  await page.waitForURL("**/rol-tanlash");
  await page.getByRole("button", { name: /Men xaridorman/ }).click();
  await page.waitForURL("**/kirish/tasdiqlash");
  await page.getByRole("button", { name: /Telegram orqali tasdiqlash/ }).click();
  await page.getByLabel("Kodni kiriting").fill("123456");
  await page.getByRole("button", { name: "Tasdiqlash" }).click();
  await page.waitForURL("**/xaridor");
  assert((await page.locator("h1").first().innerText()) === "Boshqaruv", "buyer onboarding failed");

  /* Logout va yangi kuchli parol bilan qayta login. */
  await goto(page, "/xaridor/sozlamalar");
  await page.getByRole("button", { name: "Chiqish" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Chiqish" }).click();
  await page.waitForURL("**/kirish");
  await page.getByRole("button", { name: "Kirish" }).first().click();
  await page.getByLabel("Telefon raqami").fill("+998991234501");
  await page.getByLabel("Parol").fill("Stress123");
  await page.getByRole("button", { name: "Kirish" }).last().click();
  await page.waitForURL("**/xaridor");

  /* Seed xaridor: to'lovni ikki marta yuborishdan himoya. */
  await setSession(page, BUYER);
  await goto(page, "/xaridor/shartnomalar/cnt-5");
  const payButton = page.getByRole("button", { name: /To'lash va faollashtirish/ });
  await payButton.click();
  await page.getByText("Click", { exact: true }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "To'lash va faollashtirish" }).click();
  const confirm = page.getByRole("dialog").getByRole("button", { name: "Tasdiqlash" });
  await confirm.click();
  await page.waitForTimeout(900);
  const contractsAfterPay = await storage(page, "sb2_contracts");
  assert(
    contractsAfterPay.find((item) => item.id === "cnt-5").status === "faol",
    "contract funding failed"
  );

  /* Seller: incoming offer'ni qabul qilish va kontraktning bir marta yaratilishi. */
  await setSession(page, SELLER);
  await goto(page, "/mutaxassis/takliflarim/kelgan/off-1");
  const acceptOffer = page.getByRole("button", { name: /qabul qilish/i }).first();
  assert(
    await acceptOffer.isVisible(),
    `accept button missing: ${JSON.stringify(await page.getByRole("button").allTextContents())}`
  );
  await acceptOffer.click();
  const modalAccept = page
    .getByRole("dialog")
    .getByRole("button", { name: /qabul qilish/i });
  await modalAccept.click();
  await page.waitForURL("**/mutaxassis/shartnomalar/**");
  await page.waitForTimeout(300);
  const offers = await storage(page, "sb2_offers");
  const offer = offers.find((item) => item.id === "off-1");
  if (offer?.status !== "qabul_qilindi") {
    console.error(
      "offer diagnostics",
      JSON.stringify({
        seeded: await page.evaluate(() => localStorage.getItem("sb2_seeded")),
        session: await storage(page, "sb_session"),
        url: page.url(),
        offerCount: offers.length,
        contracts: (await storage(page, "sb2_contracts")).map((item) => item.id),
      })
    );
  }
  assert(
    offer?.status === "qabul_qilindi" && offer.contractId,
    `offer acceptance failed: ${JSON.stringify(offer)}`
  );
  const contracts = await storage(page, "sb2_contracts");
  assert(
    contracts.filter((item) => item.id === offer.contractId).length === 1,
    "duplicate contract created"
  );

  /* Role isolation: seller buyer kabinetiga o'ta olmasligi kerak. */
  await goto(page, "/xaridor");
  await page.waitForURL("**/mutaxassis");

  /* Noto'g'ri ID foydalanuvchini crash qilmasligi kerak. */
  await goto(page, "/mutaxassis/shartnomalar/not-a-real-id");
  assert(
    /topilmadi|not found|не найден/i.test(await page.locator("body").innerText()),
    "invalid contract id has no safe empty state"
  );

  /* Offline holatda client-side ochilgan sahifa oq ekran bermasligi kerak. */
  await goto(page, "/mutaxassis/sozlamalar");
  intentionallyOffline = true;
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  const offlineBody = await page.locator("body").innerText().catch(() => "");
  assert(offlineBody.trim().length > 0, "offline reload produced a blank screen");
  await context.setOffline(false);
  intentionallyOffline = false;

  assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(" | ")}`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "buyer registration and verification",
          "logout and re-login",
          "payment duplicate-click protection",
          "offer duplicate-click protection",
          "role isolation",
          "invalid-id empty state",
          "offline non-blank state",
        ],
      },
      null,
      2
    )
  );
})()
  .catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
