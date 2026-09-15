import { execSync } from "node:child_process";
import { createHmac } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";

/** `docs/RUNBOOK.md` §14dagi log-mirror konvensiyasi bilan mos: `tail -f`
    orqali `/home/laziz/...` ostiga ko'chirilgan backend jurnali — steam-run
    sandboxi tashqi `/tmp` yo'llarini ko'rmaydi. */
export const OTP_LOG_PATH =
  process.env.E2E_OTP_LOG_PATH || "/home/laziz/Bobo-Doda/scratch/backend-mirror.log";
export const DB_CMD =
  process.env.E2E_DB_CMD ||
  "PGPASSWORD=app psql -h 127.0.0.1 -p 5432 -U bobododa_app -d bobododa";
export const PAYMENT_TEST_WEBHOOK_SECRET =
  process.env.PAYMENT_TEST_WEBHOOK_SECRET || "test-only-insecure-secret-change-me";
export const API_BASE = process.env.E2E_API_URL || "http://localhost:4000/api/v1";
export const CATEGORY_ID = process.env.E2E_CATEGORY_ID || "01a092fb-037e-740b-9b72-83002432b73c"; // phase4-design (lokal seed)
export const REDIS_CLI =
  process.env.E2E_REDIS_CLI || "redis-cli -h 127.0.0.1 -p 6379";

/** Bosqich 21 — bitta telefon+maqsad uchun request-otp cooldown 60s
    (`OtpService`). Bir xil maqsadda haqiqiy UI orqali IKKI MARTA so'rashni
    sinash uchun (masalan "allaqachon ro'yxatdan o'tgan telefon bilan yana
    ro'yxatdan o'tishga urinish") 60s real kutish shart emas — kalitni
    to'g'ridan-to'g'ri Redis'dan o'chiramiz. */
export function flushOtpCooldown(phone: string, purpose: "REGISTER" | "PASSWORD_RESET"): void {
  execSync(`${REDIS_CLI} DEL "ratelimit:cd:otp:cooldown:${phone}:${purpose}"`);
}

/** `registerViaUi`/E2E fixture hisoblari uchun bir xil parol. */
export const E2E_PASSWORD = "E2eTestPass1!";

/**
 * DIQQAT — nega bu suite `storageState` snapshot'ini FAYLGA yozib, uni bir
 * necha fayl/kontekst orasida QAYTA ISHLATMAYDI (avvalgi dizayn shunday
 * edi): refresh token BIR MARTALIK — ishlatilganda ROTATSIYA qilinadi va
 * eski qiymat qayta yuborilsa server uni "TOKEN_REUSED" deb rad etadi
 * (replay-hujum himoyasi, to'g'ri xavfsizlik xatti-harakati). Statik JSON
 * fayldagi "muzlatilgan" cookie'ni ikkinchi mustaqil kontekst yuklasa —
 * birinchisi allaqachon uni aylantirib bo'lgan bo'ladi, ikkinchisi 401
 * bilan yiqiladi. Bu Bosqich 17'da tirik E2E ishga tushirishda AYNAN shu
 * sababdan bir nechta test muvaffaqiyatsiz bo'lganda TOPILDI. Yechim: har
 * bir spec fayl O'ZINING kontekstini `beforeAll`da BIR MARTA ochadi va shu
 * BITTA (live, fayl emas) kontekst/sahifani butun fayl davomida qayta
 * ishlatadi — quyidagi `loginPage`/`setupApprovedSeller` shu naqshni
 * ta'minlaydi.
 */

/** UZ milliy raqam — 9 xonali, "9" bilan boshlanadi (mask: `(XX) XXX-XX-XX`
    formatiga mos, `CountryPhoneInput`ning `length: 9` talabi bilan). Har
    ishga tushirishda TASODIFIY — bir xil raqam qayta ishlatilsa kunlik/soatlik
    limitga tez tirmashadi (bu sessiyada haqiqatan sodir bo'lgan muammo). */
export function freshPhone(): string {
  const digits = "9" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return `+998${digits}`;
}

export function latestOtpFor(phone: string): string {
  const log = execSync(`grep "SMS DEV" "${OTP_LOG_PATH}" | grep "${phone}" | tail -1`).toString();
  const m = log.match(/code: '(\d{6})'/);
  if (!m) throw new Error(`OTP topilmadi (${phone}) — backend-mirror.log yangilanganmi? RUNBOOK §14ga qarang.`);
  return m[1];
}

/** Bosqich 21 — haqiqiy `/royxatdan-otish` UI oqimi orqali YANGI hisob
    yaratadi: telefon → SMS OTP → parol (3 bosqich, shortcut EMAS — bu ham
    register ekranlarining o'zini sinaydi). `freshPhone()` bilan chaqirilgani
    uchun (har doim YANGI raqam) — bu funksiya har doim REGISTER. Doim BIR
    XIL `E2E_PASSWORD` bilan yaratadi (chaqiruvchiga keyin `loginViaUi`
    bilan qaytadan kirish kerak bo'lsa shu parol ishlatiladi). Chaqiruvchi
    keyin `page.context().storageState()` bilan sessiyani saqlashi mumkin. */
export async function registerViaUi(page: Page, phone: string): Promise<void> {
  await page.goto("/royxatdan-otish", { waitUntil: "networkidle" });
  const local = phone.replace("+998", "");
  await page.locator("input").first().fill(local);
  await page.getByRole("button", { name: /Kod yuborish/i }).click();
  await page.waitForURL("**/royxatdan-otish/tasdiqlash", { timeout: 10_000 });
  await page.waitForTimeout(700); // backend log flush uchun
  const code = latestOtpFor(phone);
  await page.locator("input").first().fill(code);
  await page.getByRole("button", { name: /Tasdiqlash/i }).click();
  await page.waitForURL("**/royxatdan-otish/parol", { timeout: 10_000 });

  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(E2E_PASSWORD);
  await passwordInputs.nth(1).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /Hisob yaratish/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/royxatdan-otish"), { timeout: 10_000 });
}

/** Haqiqiy `/kirish` UI oqimi orqali MAVJUD hisobga kiradi (telefon+parol,
    SMS ISHTIROK ETMAYDI) — telefon oldindan (masalan `registerViaUi`
    bilan) ro'yxatdan o'tgan bo'lishi SHART. */
export async function loginViaUi(page: Page, phone: string, password: string = E2E_PASSWORD): Promise<void> {
  await page.goto("/kirish", { waitUntil: "networkidle" });
  const local = phone.replace("+998", "");
  await page.locator("input").first().fill(local);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^Kirish$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/kirish"), { timeout: 10_000 });
}

export async function chooseRole(page: Page, label: "Xaridor" | "Mutaxassis"): Promise<void> {
  if (!page.url().includes("rol-tanlash")) return;
  await page.getByText(label, { exact: false }).first().click();
  await page.waitForTimeout(600);
}

/** `PAYMENT_PROVIDER=TEST` webhook imzosi — `test/payment.e2e-spec.ts`dagi
    haqiqiy protokolga mos (HMAC-SHA256, xom JSON body ustida). Faqat lokal
    test uchun — real Payme'da bu funksiya umuman ishlatilmaydi. */
export async function signAndSendTestWebhook(opts: {
  paymentId: string;
  amountTiyin: number;
  status?: "SUCCEEDED" | "FAILED" | "CANCELLED";
}): Promise<void> {
  const providerPaymentId = `test_${opts.paymentId}`;
  const payload = {
    eventId: `evt-${opts.paymentId}-${Date.now()}`,
    providerPaymentId,
    eventType: opts.status === "FAILED" ? "payment.failed" : "payment.succeeded",
    status: opts.status ?? "SUCCEEDED",
    amount: opts.amountTiyin,
    currency: "UZS",
  };
  const raw = JSON.stringify(payload);
  const signature = createHmac("sha256", PAYMENT_TEST_WEBHOOK_SECRET).update(raw).digest("hex");
  const res = await fetch(`${API_BASE}/payments/webhooks/TEST`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-signature": signature },
    body: raw,
  });
  if (!res.ok) throw new Error(`webhook rejected: ${res.status} ${await res.text()}`);
}

/** Test fixture'lari uchun to'g'ridan-to'g'ri DB yozuvi — FAQAT ish jarayoni
    holati (profileDone, sellerStatus, xizmat statusi), hech qachon parol/hash.
    Sabab: xodim moderatsiyasi (sotuvchi tasdiqlash, xizmat ko'rib chiqish)
    bu sessiyada staff login orqali sinovdan o'tkazilmagan (RUNBOOK §14,
    "Tekshirilmagan/ochiq qolgan qismlar"), shuning uchun suite o'zi shu
    bosqichni DB orqali o'tkazadi. */
export function runDbCommand(sql: string): string {
  return execSync(`${DB_CMD} -c "${sql.replace(/"/g, '\\"')}"`).toString();
}

/** Bitta fayl uchun BITTA jonli xaridor kontekst/sahifa ochadi (yangi
    tasodifiy raqam bilan) — `test.beforeAll`da chaqirilsin, `test.afterAll`da
    `context.close()` bilan yopilsin. Bir nechta `test()` shu BITTA `page`ni
    qayta ishlatishi kerak (`test.describe.serial()` bilan birga) — yangi
    `browser.newContext({storageState})` HAR SAFAR YARATILMASIN (yuqoridagi
    izohga qarang — refresh token bir martalik). */
export async function loginBuyer(browser: Browser): Promise<{ context: BrowserContext; page: Page; phone: string }> {
  const phone = freshPhone();
  const context = await browser.newContext();
  const page = await context.newPage();
  await registerViaUi(page, phone);
  await chooseRole(page, "Xaridor");
  return { context, page, phone };
}

/** Xuddi shu — lekin sotuvchi: OTP kirish + rol tanlash, so'ng DB orqali
    tasdiqlash (`sellerStatus='APPROVED'`, `profileDone=true`, ish jarayoni
    holati) va real API orqali BITTA faol xizmat yaratadi. Sahifani
    `reload()` qilish OTP SO'RAMASDAN yangi `profileDone`ni localStorage'ga
    tortib oladi (`bootstrapSession()` httpOnly cookie orqali). */
export async function setupApprovedSeller(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page; phone: string; serviceId: string }> {
  const phone = freshPhone();
  const context = await browser.newContext();
  const page = await context.newPage();
  await registerViaUi(page, phone);
  await chooseRole(page, "Mutaxassis");

  runDbCommand(
    `UPDATE users SET "profileDone"=true, "sellerStatus"='APPROVED', "fullName"='E2E Sotuvchi' WHERE phone='${phone}'`,
  );
  const appRow = runDbCommand(
    `INSERT INTO seller_applications (id, "userId", "legalName", "displayName", description, status, "submittedAt", "reviewedAt", "createdAt", "updatedAt") ` +
      `SELECT gen_random_uuid(), id, 'E2E Legal Name', 'E2E Seller Studio', 'Playwright suite fixture', 'APPROVED', now(), now(), now(), now() FROM users WHERE phone='${phone}' RETURNING id`,
  );
  if (!appRow.includes("1 row")) throw new Error("seller_applications fixture insert failed: " + appRow);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const refreshRes = await page.request.post(`${API_BASE}/auth/refresh`);
  const { accessToken } = (await refreshRes.json()) as { accessToken: string };
  const svcRes = await fetch(`${API_BASE}/seller/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      categoryId: CATEGORY_ID,
      title: "E2E fixture xizmati",
      description: "Playwright suite uchun avtomatik yaratilgan xizmat.",
      price: 900_000,
      deliveryDays: 7,
    }),
  });
  const service = (await svcRes.json()) as { id?: string };
  if (!service.id) throw new Error("seller service fixture create failed: " + JSON.stringify(service));
  runDbCommand(`UPDATE services SET status='ACTIVE' WHERE id='${service.id}'`);

  return { context, page, phone, serviceId: service.id };
}
