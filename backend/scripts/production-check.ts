/**
 * Bosqich 12/13, bo'lim 27/72 — production launch preflight. `boot-check.ts`/
 * `financial-check.ts` bilan BIR XIL naqsh: butun `AppModule`ni ko'taradi
 * (env validation + F1 DB rol/append-only assertion + Redis connection —
 * HAMMASI `app.init()` ichida, qo'shimcha kod YOZILMAGAN) va keyin bir
 * nechta QO'SHIMCHA, real tashqi mutatsiya QILMAYDIGAN tekshiruv qiladi:
 *
 *   1. Boot muvaffaqiyatli (env/DB rol assertion/Redis — implicit, yuqorida)
 *   2. PAYMENT_PROVIDER production uchun xavfsiz (TEST emas) + Payme credential to'liq
 *   3. SMS_PROVIDER production uchun xavfsiz (CONSOLE emas) + PlayMobile credential to'liq
 *   4. Payout — PAYOUTS_ENABLED=false (xavfsiz o'chirilgan) YOKI real provider
 *   5. Swagger o'chirilgan
 *   6. CORS_ORIGINS bo'sh/wildcard emas
 *   7. Migratsiyalar joriy (`prisma migrate status`)
 *   8. financial:check (CRITICAL anomaliya yo'q)
 *
 * Real Payme/PlayMobile/Redis'ga HECH QANDAY tashqi yozuvchi/tranzaksiya/
 * SMS chaqiruvi YO'Q.
 *
 *   node --require ts-node/register/transpile-only \
 *        --require tsconfig-paths/register scripts/production-check.ts
 *
 * Exit 0 — barcha tekshiruv o'tdi (launch mumkin). Exit 1 — kamida
 * bittasi muvaffaqiyatsiz (launch BLOKLANGAN).
 */
import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { AppConfigService } from '@/config/app-config.service';
import { FinancialIntegrityService } from '@/modules/reconciliation/financial-integrity.service';

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

function checkMigrationsCurrent(): CheckResult {
  try {
    const output = execFileSync('npx', ['prisma', 'migrate', 'status'], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL },
    });
    const upToDate = output.includes('Database schema is up to date');
    return {
      name: 'migrations_current',
      ok: upToDate,
      detail: upToDate ? 'schema up to date' : 'pending/drifted migrations — deploy migratsiyani ALOHIDA qadam sifatida bajaring',
    };
  } catch (err) {
    return { name: 'migrations_current', ok: false, detail: `prisma migrate status failed: ${(err as Error).message}` };
  }
}

async function main(): Promise<void> {
  const results: CheckResult[] = [];

  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.init(); // Bo'lim 47/48/49 — env/DB rol (F1)/Redis SHU YERDA implicit tekshiriladi (fail bo'lsa throw).
  results.push({ name: 'boot', ok: true, detail: 'env valid, DB rol assertion (F1) o‘tdi, Redis ulandi' });

  const config = app.get(AppConfigService);
  const paymentOk = config.payment.provider !== 'TEST';
  results.push({
    name: 'payment_provider_not_test',
    ok: paymentOk,
    detail: paymentOk ? `PAYMENT_PROVIDER=${config.payment.provider}` : 'PAYMENT_PROVIDER=TEST — production uchun yaroqsiz',
  });
  if (config.payment.provider === 'PAYME') {
    const { merchantId, login, key, checkoutUrl } = config.payme;
    const complete = Boolean(merchantId && login && key && checkoutUrl);
    results.push({
      name: 'payme_credentials_complete',
      ok: complete,
      detail: complete ? 'PAYME_MERCHANT_ID/LOGIN/KEY/CHECKOUT_URL hammasi bor' : 'Payme credential(lar) yetishmayapti',
    });
  }

  const smsOk = config.sms.provider !== 'CONSOLE';
  results.push({
    name: 'sms_provider_not_console',
    ok: smsOk,
    detail: smsOk ? `SMS_PROVIDER=${config.sms.provider}` : 'SMS_PROVIDER=CONSOLE — production uchun yaroqsiz (real SMS yuborilmaydi)',
  });
  if (config.sms.provider === 'PLAYMOBILE') {
    const { apiUrl, login, password, sender } = config.playMobile;
    const complete = Boolean(apiUrl && login && password && sender);
    results.push({
      name: 'playmobile_credentials_complete',
      ok: complete,
      detail: complete ? 'PLAYMOBILE_API_URL/LOGIN/PASSWORD/SENDER hammasi bor' : 'PlayMobile credential(lar) yetishmayapti',
    });
  }

  // Bo'lim 48 — real payout rail hali tanlanmagan: PAYOUTS_ENABLED=false
  // bo'lishi XAVFSIZ (ochiq, ataylab o'chirilgan) holat — "TEST" esa
  // boot'ning o'zida ALLAQACHON bloklangan (payout.module.ts), shuning
  // uchun bu yerga yetib kelgan bo'lsa payout muammosiz.
  const payoutOk = !config.payoutsEnabled || config.payout.provider !== 'TEST';
  results.push({
    name: 'payout_status',
    ok: payoutOk,
    detail: !config.payoutsEnabled
      ? 'PAYOUTS_ENABLED=false — feature xavfsiz o‘chirilgan (real payout rail hali tanlanmagan)'
      : `PAYOUTS_ENABLED=true, PAYOUT_PROVIDER=${config.payout.provider}`,
  });

  results.push({
    name: 'swagger_disabled',
    ok: !config.swaggerEnabled,
    detail: !config.swaggerEnabled ? 'SWAGGER_ENABLED=false' : 'SWAGGER_ENABLED=true — production uchun yaroqsiz',
  });

  const corsOk = config.corsOrigins.length > 0 && !config.corsOrigins.includes('*');
  results.push({
    name: 'cors_configured',
    ok: corsOk,
    detail: corsOk ? `CORS_ORIGINS: ${config.corsOrigins.join(', ')}` : 'CORS_ORIGINS bo‘sh yoki "*" — aniq domenlar kerak',
  });

  // Bo'lim 3 (admin.bobododa.uz) — `STAFF_CORS_ORIGINS` marketplace
  // ro'yxatidan ALOHIDA (main.ts CORS delegate). Bo'sh/wildcard bo'lsa
  // staff/* butunlay CORS bilan bloklanadi (fail-closed, o'zi xavfli emas),
  // lekin bu odatda operator xatosi — shuning uchun shu yerda ham
  // ogohlantiriladi.
  const staffCorsOk = config.staffCorsOrigins.length > 0 && !config.staffCorsOrigins.includes('*');
  results.push({
    name: 'staff_cors_configured',
    ok: staffCorsOk,
    detail: staffCorsOk
      ? `STAFF_CORS_ORIGINS: ${config.staffCorsOrigins.join(', ')}`
      : 'STAFF_CORS_ORIGINS bo‘sh yoki "*" — admin.bobododa.uz aniq ko‘rsatilishi kerak',
  });

  results.push(checkMigrationsCurrent());

  const integrity = app.get(FinancialIntegrityService);
  const scan = await integrity.scan();
  results.push({
    name: 'financial_check',
    ok: scan.critical === 0,
    detail: scan.critical === 0 ? 'CRITICAL anomaliya yo‘q' : `${scan.critical} ta CRITICAL anomaliya topildi`,
  });

  await app.close();

  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`${JSON.stringify({ results, production: config.isProduction }, null, 2)}\n`);

  if (failed.length > 0) {
    process.stderr.write(`PRODUCTION_CHECK_FAILED: ${failed.map((r) => r.name).join(', ')}\n`);
    process.exit(1);
  }
  process.stdout.write('PRODUCTION_CHECK_OK\n');
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`PRODUCTION_CHECK_ERROR: ${(err as Error).message ?? String(err)}\n`);
  process.exit(1);
});
