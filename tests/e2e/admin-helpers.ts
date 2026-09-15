import { execSync } from "node:child_process";
import { createHmac } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";

/**
 * Bosqich 18 — ADMIN E2E uchun TO'LIQ IZOLYATSIYALANGAN stack: alohida
 * Postgres (:55433), alohida Redis (:6390), alohida backend (:4010),
 * alohida frontend (:3010). Dev/prod bazasiga HECH NARSA yozilmaydi.
 * Infra `scratch/e2e-infra/` ostida qo'lda ko'tarilgan (RUNBOOK §18) —
 * bu fayl FAQAT ular allaqachon ishga tushirilgan deb hisoblab ulanadi.
 */
export const ADMIN_BASE_URL = process.env.E2E_ADMIN_BASE_URL || "http://localhost:3010";
export const ADMIN_API_BASE = process.env.E2E_ADMIN_API_URL || "http://localhost:4010/api/v1";
const OTP_LOG_PATH = process.env.E2E_ADMIN_OTP_LOG_PATH || "/home/laziz/Bobo-Doda/scratch/e2e-infra/backend.log";
const DB_CMD =
  process.env.E2E_ADMIN_DB_CMD ||
  "psql -h 127.0.0.1 -p 55433 -U bobododa_app -d bobododa_e2e";
const WEBHOOK_SECRET = process.env.PAYMENT_TEST_WEBHOOK_SECRET || "test-only-insecure-secret-change-me";

export const E2E_STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "E2eTest#2026Pass";
export const SUPER_ADMIN_EMAIL = "super@e2e.test";
export const RESET_ADMIN_EMAIL = "reset@e2e.test";
export const RESTRICTED_ADMIN_EMAIL = "restricted@e2e.test";

function freshPhone(): string {
  const digits = "9" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return `+998${digits}`;
}

function latestOtpFor(phone: string): string {
  const log = execSync(`grep "SMS DEV" "${OTP_LOG_PATH}" | grep "${phone}" | tail -1`).toString();
  const m = log.match(/code: '(\d{6})'/);
  if (!m) throw new Error(`OTP topilmadi (${phone}) — isolated backend logi: ${OTP_LOG_PATH}`);
  return m[1];
}

function runDbCommand(sql: string): string {
  return execSync(`${DB_CMD} -c "${sql.replace(/"/g, '\\"')}"`).toString();
}

/** Real `/staff/auth/login` orqali kiradi — fake JWT/localStorage bypass
    YO'Q. `role="admin"|"super_admin"` bo'yicha to'g'ri portalni tanlaydi
    (`AdminLoginForm`ning `expectedRole` tekshiruviga mos — SUPER_ADMIN
    hisob `/admin/kirish`da avtomatik logout+FORBIDDEN bo'ladi, chunki u
    faqat "admin"ni kutadi). */
export async function staffLogin(
  page: Page,
  email: string,
  password: string,
  portal: "admin" | "rahbariyat" = "rahbariyat",
): Promise<void> {
  await page.goto(`${ADMIN_BASE_URL}/${portal}/kirish`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /Xavfsiz kirish/i }).click();
  // Belgilangan timeout emas — tizim yuklamasi ostida sekinlashsa keyingi
  // `page.goto()` sessiya hali yozilmasdan poyga qilib ketardi (bu
  // sessiyada aynan shu sababdan bitta test flaky bo'lgani kuzatildi).
  await page.waitForURL((url) => !url.pathname.includes("/kirish"), { timeout: 10_000 });
}

/**
 * Isolated backend'da REAL API orqali: kategoriya (allaqachon DB'ga
 * qo'yilgan, RUNBOOK §18), xaridor+sotuvchi (OTP), xizmat, shartnoma,
 * to'lov (TEST webhook bilan SUCCEEDED), va OCHIQ nizo yaratadi — admin
 * sahifalarida (Foydalanuvchilar/Shartnomalar/To'lovlar/Nizolar) haqiqiy
 * qator bo'lishi uchun. Faqat FETCH orqali (brauzersiz) — tez.
 */
export async function seedAdminTestData(): Promise<{
  contractId: string;
  paymentId: string;
  buyerPhone: string;
  sellerPhone: string;
}> {
  const CATEGORY_ID = execSync(`${DB_CMD} -t -A -c "SELECT id FROM categories ORDER BY \\"createdAt\\" LIMIT 1;"`)
    .toString()
    .trim();
  if (!CATEGORY_ID) throw new Error("isolated DB'da categories bo'sh — avval RUNBOOK §18dagi bootstrap'ni bajaring");

  const buyerPhone = freshPhone();
  const sellerPhone = freshPhone();

  // Bosqich 20 — `freshPhone()` bilan chaqirilgani uchun (har doim YANGI
  // raqam) bu funksiya har doim REGISTER, LOGIN emas.
  async function otpLoginToken(phone: string): Promise<string> {
    const reqRes = await fetch(`${ADMIN_API_BASE}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, intent: "REGISTER" }),
    });
    if (reqRes.status !== 200) throw new Error(`otp/request ${phone}: ${reqRes.status} ${await reqRes.text()}`);
    await new Promise((r) => setTimeout(r, 500));
    const code = latestOtpFor(phone);
    const verifyRes = await fetch(`${ADMIN_API_BASE}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, intent: "REGISTER" }),
    });
    const session = (await verifyRes.json()) as { accessToken?: string };
    if (!session.accessToken) throw new Error(`otp/verify ${phone}: ${JSON.stringify(session)}`);
    return session.accessToken;
  }

  const buyerTokenPre = await otpLoginToken(buyerPhone);
  const sellerTokenPre = await otpLoginToken(sellerPhone);

  // `/me/roles/choose` YANGI accessToken qaytaradi (`activeRole` endi
  // to'ldirilgan) — eski (rol tanlanmagan) token bilan davom etilsa
  // keyingi chaqiruvlar "NOT_ALLOWED" bilan rad etiladi.
  const buyerChooseRes = await fetch(`${ADMIN_API_BASE}/me/roles/choose`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyerTokenPre}` },
    body: JSON.stringify({ role: "BUYER" }),
  });
  const { accessToken: buyerToken } = (await buyerChooseRes.json()) as { accessToken: string };
  const sellerChooseRes = await fetch(`${ADMIN_API_BASE}/me/roles/choose`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerTokenPre}` },
    body: JSON.stringify({ role: "SELLER" }),
  });
  const { accessToken: sellerToken } = (await sellerChooseRes.json()) as { accessToken: string };

  // Xodim moderatsiyasi o'rniga to'g'ridan-to'g'ri DB orqali tasdiqlash —
  // ish jarayoni holati, parol/hash EMAS (buyer/seller tomonidagi
  // xaridor/sotuvchi profillari — staff credential emas).
  runDbCommand(
    `UPDATE users SET "profileDone"=true, "sellerStatus"='APPROVED', "fullName"='E2E Admin-Fixture Sotuvchi' WHERE phone='${sellerPhone}'`,
  );
  runDbCommand(`UPDATE users SET "profileDone"=true, "fullName"='E2E Admin-Fixture Xaridor' WHERE phone='${buyerPhone}'`);

  const svcRes = await fetch(`${ADMIN_API_BASE}/seller/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      categoryId: CATEGORY_ID,
      title: "Admin E2E fixture xizmati",
      description: "Isolated admin E2E muhiti uchun avtomatik yaratilgan xizmat.",
      price: 900_000,
      deliveryDays: 7,
    }),
  });
  const service = (await svcRes.json()) as { id?: string };
  if (!service.id) throw new Error("service create failed: " + JSON.stringify(service));
  runDbCommand(`UPDATE services SET status='ACTIVE' WHERE id='${service.id}'`);

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);
  const contractRes = await fetch(`${ADMIN_API_BASE}/contracts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${buyerToken}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      serviceId: service.id,
      deadline: deadline.toISOString(),
      milestones: [{ title: "To'liq ish", amount: 900_000 }],
    }),
  });
  const contract = (await contractRes.json()) as { id?: string };
  if (!contract.id) throw new Error("contract create failed: " + JSON.stringify(contract));

  await fetch(`${ADMIN_API_BASE}/seller/contracts/${contract.id}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sellerToken}` },
  });

  const payRes = await fetch(`${ADMIN_API_BASE}/me/contracts/${contract.id}/payment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${buyerToken}`, "Idempotency-Key": crypto.randomUUID() },
  });
  const payment = (await payRes.json()) as { id?: string };
  if (!payment.id) throw new Error("payment create failed: " + JSON.stringify(payment));

  const providerPaymentId = `test_${payment.id}`;
  const payload = {
    eventId: `evt-${payment.id}-${Date.now()}`,
    providerPaymentId,
    eventType: "payment.succeeded",
    status: "SUCCEEDED",
    amount: 90_000_000,
    currency: "UZS",
  };
  const raw = JSON.stringify(payload);
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
  const webhookRes = await fetch(`${ADMIN_API_BASE}/payments/webhooks/TEST`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-signature": signature },
    body: raw,
  });
  if (!webhookRes.ok) throw new Error("webhook failed: " + webhookRes.status);

  const disputeRes = await fetch(`${ADMIN_API_BASE}/me/contracts/${contract.id}/disputes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${buyerToken}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ reason: "QUALITY", description: "Admin E2E fixture uchun ochilgan test nizosi." }),
  });
  if (!disputeRes.ok) throw new Error("dispute open failed: " + disputeRes.status + " " + (await disputeRes.text()));

  return { contractId: contract.id, paymentId: payment.id, buyerPhone, sellerPhone };
}

export async function newAdminPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}
