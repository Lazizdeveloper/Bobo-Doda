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

    // ── Auth (Bosqich 2 da .min(32) majburiy bo'ladi) ──────────────────
    JWT_ACCESS_SECRET: z.string().min(16).optional(),
    JWT_REFRESH_SECRET: z.string().min(16).optional(),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),

    // ── To'lov gateway'lari (Bosqich 5) ────────────────────────────────
    PAYME_MERCHANT_ID: z.string().optional(),
    PAYME_KEY: z.string().optional(),
    CLICK_MERCHANT_ID: z.string().optional(),
    CLICK_SERVICE_ID: z.string().optional(),
    CLICK_SECRET_KEY: z.string().optional(),

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
