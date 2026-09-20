import { defineConfig, devices } from "@playwright/test";

/**
 * Bosqich 17 — real backendga qarshi E2E suite. `docs/RUNBOOK.md` §14dagi
 * to'liq stack (backend `nix-shell --run "npm run start:dev"`, frontend
 * `.env.local` bilan `npm run dev`) ISHLAB TURGANI SHART — bu suite mock
 * ma'lumotga emas, real Postgres+Redis'ga ulanadi.
 *
 * DIQQAT — OTP so'rov cheklovi: backend har bir IP'dan soatiga 20 ta
 * `/auth/otp/request` so'roviga ruxsat beradi (barcha telefon raqamlari
 * BIRGALIKDA hisoblanadi, backend/src/modules/auth/constants/otp.constants.ts).
 * Har bir spec fayl `test.beforeAll`da O'ZINING kontekstini BIR MARTA ochadi
 * (`tests/e2e/helpers.ts` — `loginBuyer`/`setupApprovedSeller`) va shu bitta
 * jonli sahifani fayl davomida qayta ishlatadi — `storageState` FAYLGA
 * yozib qayta yuklanmaydi (refresh token bir martalik, "TOKEN_REUSED"
 * xatosi — bu sessiyada tirik E2E ishga tushirilganda aynan shu sababdan
 * topilgan haqiqiy naqsh, RUNBOOK §14). `workers: 1` va `fullyParallel:
 * false` ataylab — parallel ishga tushirish bir nechta spec'ni bir vaqtda
 * OTP so'rashga majburlagan taqdirda ham shu chegarani buzmasin.
 */
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
