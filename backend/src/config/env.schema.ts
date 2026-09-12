import { z } from 'zod';

/**
 * Muhit o'zgaruvchilari sxemasi (Zod).
 *
 * MAJBURIY qiymat yo'q bo'lsa app boot BO'LMAYDI — `validateEnv` xato tashlaydi
 * va NestFactory ko'tarilmaydi. Bu ataylab: yarim-sozlangan server ishga
 * tushib, birinchi so'rovda 500 berishdan ko'ra, umuman ko'tarilmagani xavfsiz.
 *
 * Bosqichlararo qat'iylashtirish:
 *  • Bosqich 1 — DATABASE_URL, REDIS_URL majburiy.
 *  • Bosqich 2 — JWT_* sirlari majburiy (≥32 belgi).
 *  • Bosqich 5 — NODE_ENV=production da PAYME / CLICK sirlari majburiy (fail closed).
 */

const csv = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

/** `"15m"`, `"30d"`, `"8h"` — `duration.util.ts#parseDurationMs` bilan BIR XIL qoida. */
const DURATION_SPEC = z
  .string()
  .regex(/^\d+[smhd]$/, 'Format: son + birlik (s/m/h/d), masalan "15m", "30d"');

export const envSchema = z
  .object({
    // ── Runtime ──────────────────────────────────────────────────────────
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SWAGGER_ENABLED: booleanish.default('true'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform(csv),

    // ── Datastores (MAJBURIY — Bosqich 1) ────────────────────────────────
    // A4 — ikki alohida rol, ikki alohida URL:
    //   DATABASE_URL           → `bobododa_app`      (runtime, kam huquq;
    //                            append-only jadvallarga UPDATE/DELETE yo'q)
    //   DATABASE_MIGRATION_URL → `bobododa_migrator` (DDL / CREATE EXTENSION /
    //                            GRANT — faqat `prisma migrate deploy`)
    // Ikkalasi ham majburiy: schema `directUrl` uni talab qiladi va
    // "append-only kodda emas, DB darajasida" faqat rol ajratilganda ishlaydi.
    DATABASE_URL: z.string().min(1, 'DATABASE_URL majburiy').url(),
    DATABASE_MIGRATION_URL: z.string().min(1, 'DATABASE_MIGRATION_URL majburiy').url(),
    REDIS_URL: z.string().min(1, 'REDIS_URL majburiy').url(),
    // F1 — boot paytida "current_user = DB_APP_ROLE, append-only buzilmagan,
    // kengaytmalar bor" tekshiradi; yiqilsa ilova ko'tarilmaydi (fail closed).
    // "off" faqat dev/test qulayligi uchun — pastda production'da RAD ETILADI.
    DB_ROLE_ASSERTION: z
      .enum(['on', 'off'])
      .default('on')
      .transform((v) => v === 'on'),
    // T1 — runtime rol nomi QATTIQ YOZILMAGAN: ba'zi managed Postgres
    // provayderlari rol nomiga cheklov qo'yadi (prefiks, uzunlik, rezervlangan
    // so'z). Postgres kvotalanmagan identifikator qoidasi: kichik harf/pastki
    // chiziq bilan boshlanadi, ≤63 belgi. `roles.sql`/migratsiya shu qiymatni
    // DB darajasidagi GUC (`bobododa.app_role`) orqali oladi.
    DB_APP_ROLE: z
      .string()
      .regex(
        /^[a-z_][a-z0-9_]{0,62}$/,
        'DB_APP_ROLE — kvotalanmagan Postgres identifikatori bo\'lishi shart (kichik harf/pastki chiziq bilan boshlanadi, ≤63 belgi)',
      )
      .default('bobododa_app'),

    // ── S3 / MinIO (Bosqich 2+ da majburiy) ─────────────────────────────
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_BUCKET_UPLOADS: z.string().default('bobododa-uploads'),
    S3_BUCKET_KYC: z.string().default('bobododa-kyc'),

    // ── Auth (Bosqich 2 — MAJBURIY) ─────────────────────────────────────
    // Marketplace (User) va Staff — ATAYLAB ALOHIDA ACCESS sirlar (talab:
    // "Staff auth alohida bo'lsin"). Bir xil sir bo'lganda, guard'dagi bitta
    // xato marketplace tokenini staff route'da qabul qilib qo'yishi mumkin
    // edi — alohida sir bilan bu KRIPTOGRAFIK jihatdan imkonsiz.
    //
    // DIQQAT: "REFRESH_SECRET" YO'Q (ataylab) — refresh token JWT EMAS,
    // opaque tasodifiy satr (`opaque-token.util.ts`), DB'da SHA-256 hash
    // bilan saqlanadi va QIDIRUV orqali tekshiriladi. Imzolash siri kerak
    // emas — bo'lganda ham xavfsizlikka hech narsa qo'shmasdi (token
    // o'zi 256 bit entropiyaga ega), faqat ishlatilmaydigan konfiguratsiya
    // bo'lib qolardi.
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET kamida 32 belgi'),
    JWT_STAFF_ACCESS_SECRET: z.string().min(32, 'JWT_STAFF_ACCESS_SECRET kamida 32 belgi'),
    // `\d+[smhd]` — `duration.util.ts#parseDurationMs` VA `TokenService`
    // (`jsonwebtoken`ga uzatilishidan oldin) ANIQ shu formatni kutadi.
    JWT_ACCESS_TTL: DURATION_SPEC.default('15m'),
    // Refresh — opaque token muddati; faqat `RefreshToken.expiresAt` /
    // `StaffSession.expiresAt` hisoblash uchun (`parseDurationMs` formati).
    JWT_REFRESH_TTL: DURATION_SPEC.default('30d'),
    JWT_STAFF_ACCESS_TTL: DURATION_SPEC.default('15m'),
    JWT_STAFF_REFRESH_TTL: DURATION_SPEC.default('8h'),

    // ── To'lov gateway'lari (Bosqich 5) ────────────────────────────────
    // `PAYMENT_PROVIDER` — provider registry kaliti (`payment.module.ts`).
    // Real PAYME/CLICK protokoli hali IMPLEMENT QILINMAGAN (bo'lim 7: repo/
    // docs'da signature/callback spec yo'q, o'ylab topilmaydi) — ularni
    // tanlash hozircha HAR QANDAY muhitda boot vaqtida rad etiladi
    // (`assertPaymentProviderSupported`). `TEST` — faqat dev/test uchun,
    // production'da pastdagi `superRefine` fail-fast qiladi.
    PAYMENT_PROVIDER: z.enum(['TEST', 'PAYME', 'CLICK']).default('TEST'),
    // Test provider HMAC siri — faqat dev/test. Berilmasa dev-only sukut
    // qiymat ishlatiladi (`payment.module.ts`) — production'da TEST provider
    // umuman tanlanolmaydi, shuning uchun bu yerda MAJBURIY emas.
    PAYMENT_TEST_WEBHOOK_SECRET: z.string().min(16).optional(),
    PAYME_MERCHANT_ID: z.string().optional(),
    PAYME_KEY: z.string().optional(),
    CLICK_MERCHANT_ID: z.string().optional(),
    CLICK_SERVICE_ID: z.string().optional(),
    CLICK_SECRET_KEY: z.string().optional(),

    // ── Payout rail (Bosqich 7) — Payment'dan ALOHIDA provider munosabati
    // (bo'lim 28: real hayotda butunlay boshqa kompaniya bo'lishi mumkin).
    // Xuddi PAYMENT_PROVIDER bilan bir xil fail-fast falsafa.
    PAYOUT_PROVIDER: z.enum(['TEST']).default('TEST'),
    PAYOUT_TEST_WEBHOOK_SECRET: z.string().min(16).optional(),

    // ── Telegram support (Bosqich 6) ──────────────────────────────────
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_SUPPORT_CHAT_ID: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // To'lov callback bypass'i production'da IMKONSIZ — ikki qatlamdan biri
    // (env validation). Ikkinchi qatlam runtime check (Bosqich 5).
    if (env.NODE_ENV === 'production') {
      if (env.SWAGGER_ENABLED) {
        // Ogohlantirish emas — xato: production'da /docs ochiq qolmasin.
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SWAGGER_ENABLED'],
          message: "production'da SWAGGER_ENABLED=false bo'lishi shart",
        });
      }
      if (!env.DB_ROLE_ASSERTION) {
        // F1 — append-only himoyasini prod'da o'chirib qo'yish IMKONSIZ.
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DB_ROLE_ASSERTION'],
          message: "production'da DB_ROLE_ASSERTION=off IMKONSIZ (fail closed)",
        });
      }
      // Bosqich 5, bo'lim 45 — "NODE_ENV=production'da fake provider bilan
      // boot qilish fail bo'lsin". PAYME/CLICK ham hali implement qilinmagan
      // (`payment.module.ts` ikkalasini ham har doim rad etadi) — natijada
      // hozircha production HECH QANDAY provider bilan ko'tarilolmaydi, bu
      // ATAYLAB: real provider ulanmaguncha to'lov qabul qiluvchi prod
      // muhit ishga tushmasligi kerak.
      if (env.PAYMENT_PROVIDER === 'TEST') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYMENT_PROVIDER'],
          message: "production'da PAYMENT_PROVIDER=TEST IMKONSIZ (fail closed)",
        });
      }
      // Bosqich 7 — Payout uchun hozircha Zod darajasida DUBLIKAT qilinmadi
      // (PAYME/CLICK'dan farqli, `PAYOUT_PROVIDER` enum'ida "kelajakda
      // implement qilinadigan, lekin hozir Zod'dan o'tadigan" haqiqiy qiymat
      // UMUMAN YO'Q — faqat `TEST`). Shuning uchun bu yerga qo'shsak HAR BIR
      // boshqa (payout'ga aloqasi yo'q) production testi ham default
      // `TEST` tufayli beixtiyor yiqilar edi. Fail-closed himoya YAGONA
      // qatlamda — `payout.module.ts` factory — chunki u yerda ham
      // `PAYOUT_PROVIDER`ning BOSHQA qiymati yo'q, natija bir xil: real
      // provider ulanmaguncha production umuman ko'tarilolmaydi.
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * `ConfigModule.forRoot({ validate })` uchun. Xato bo'lsa — o'qiladigan
 * xabar bilan `Error` tashlaydi (barcha muammoli kalitlar sanab).
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Muhit o'zgaruvchilari validatsiyasi muvaffaqiyatsiz:\n${details}`);
  }
  return parsed.data;
}
