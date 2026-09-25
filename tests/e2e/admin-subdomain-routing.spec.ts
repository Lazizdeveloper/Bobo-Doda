import { test, expect } from "@playwright/test";

/**
 * Bo'lim 3 (admin.bobododa.uz ko'chirish) — repo ildizidagi `proxy.ts`ning
 * host-asoslangan qayta yozish/yo'naltirish mantig'i uchun regressiya
 * qamrovi. QA ko'rib chiqishi topilmasi (F4): bu mantiq ilgari faqat
 * qo'lda `curl -H "Host: ..."` bilan bir martalik tekshirilgan edi,
 * committed avtomatik test yo'q edi.
 *
 * FAQAT `request` fixture ishlatiladi (`page` EMAS) — brauzer UMUMAN
 * kerak emas, shuning uchun bu spec RUNBOOK §14/§18dagi og'ir
 * nix-shell+steam-run brauzer o'ramisiz ham ishlaydi (faqat ishlab
 * turgan Next.js serverga real HTTP so'rov, `Host` header'i qalbakilashtirilgan
 * holda — xuddi `proxy.ts`ning o'zi ishlab chiqarishda ko'radigan narsa).
 *
 * `E2E_BASE_URL` ishlab turgan Next.js serverga ko'rsatishi kerak
 * (masalan izolyatsiyalangan stack — RUNBOOK §18 — yoki oddiy `npm run dev`).
 * Redirect'lar avtomatik follow qilinmaydi (`maxRedirects: 0`) — har bir
 * qadam alohida tekshiriladi, aks holda zanjirning o'zi haqiqiy yo'l
 * ekanini yashirib qo'yardi.
 */

const ADMIN_HOST = "admin.bobododa.uz";
const APP_HOST = "app.bobododa.uz";

test.describe("proxy.ts — admin.bobododa.uz host-asoslangan routing", () => {
  test("admin host: /kirish ichki /admin/kirish ga qayta yoziladi (200, noindex)", async ({ request }) => {
    const res = await request.get("/kirish", {
      headers: { host: ADMIN_HOST },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("admin host: / ildizi ham 200 va noindex qaytaradi (dashboard qobig'i)", async ({ request }) => {
    const res = await request.get("/", { headers: { host: ADMIN_HOST }, maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("admin host: /admin/kirish o'ziga (prefikssiz) qayta yo'naltiriladi — kanonizatsiya, sikl yo'q", async ({ request }) => {
    const res = await request.get("/admin/kirish?next=x", { headers: { host: ADMIN_HOST }, maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = res.headers()["location"];
    expect(location).toContain("://admin.bobododa.uz/kirish?next=x");
    // Qayta yo'naltirilgan manzil o'zi yana qayta yo'naltirilmasin (sikl yo'q):
    const target = new URL(location);
    const second = await request.get(target.pathname + target.search, {
      headers: { host: ADMIN_HOST },
      maxRedirects: 0,
    });
    expect(second.status()).toBe(200);
  });

  test("admin host: marketplace’ga xos yo'l (/mutaxassis) o'ziga TAKRORLANMAYDI — app host'ga qaytariladi", async ({ request }) => {
    const res = await request.get("/mutaxassis", { headers: { host: ADMIN_HOST }, maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toBe(`https://${APP_HOST}/mutaxassis`);
  });

  test("admin host: ko'p bo'g'inli marketplace dinamik yo'l (nuqta bilan) HAM app host'ga qaytariladi (ikkinchi security ko'rib chiqishi topilmasi)", async ({
    request,
  }) => {
    const res = await request.get("/xaridor/shartnomalar/abc.x", { headers: { host: ADMIN_HOST }, maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toBe(`https://${APP_HOST}/xaridor/shartnomalar/abc.x`);
  });

  test("admin host: /robots.txt, /rahbariyat/kirish o'zgarishsiz xizmat qilinadi (statik/o'z holicha)", async ({ request }) => {
    const robots = await request.get("/robots.txt", { headers: { host: ADMIN_HOST }, maxRedirects: 0 });
    expect(robots.status()).toBe(200);
    const rahbariyat = await request.get("/rahbariyat/kirish", { headers: { host: ADMIN_HOST }, maxRedirects: 0 });
    expect(rahbariyat.status()).toBe(200);
  });

  test("app host: eski /admin/* havolasi query-string bilan admin host'ga qayta yo'naltiriladi, prefiks olib tashlanadi", async ({
    request,
  }) => {
    const res = await request.get("/admin/shartnomalar?filter=faol", {
      headers: { host: APP_HOST },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toBe(`https://${ADMIN_HOST}/shartnomalar?filter=faol`);
  });

  test("app host: /rahbariyat/kirish prefikssiz admin host'ga qayta yo'naltiriladi", async ({ request }) => {
    const res = await request.get("/rahbariyat/kirish", { headers: { host: APP_HOST }, maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toBe(`https://${ADMIN_HOST}/rahbariyat/kirish`);
  });

  test("app host: o'zining /kirish (bozor login) sahifasi ta'sirlanmaydi, noindex olmaydi", async ({ request }) => {
    const res = await request.get("/kirish", { headers: { host: APP_HOST }, maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()["x-robots-tag"]).toBeUndefined();
  });

  test("noma'lum/mos kelmagan host: /admin/kirish o'zgarishsiz (lokal dev bilan orqaga mos)", async ({ request }) => {
    const res = await request.get("/admin/kirish", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
});
