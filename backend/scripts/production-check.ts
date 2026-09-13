/**
 * Bosqich 12, bo'lim 72 — production launch preflight. `boot-check.ts`/
 * `financial-check.ts` bilan BIR XIL naqsh: butun `AppModule`ni ko'taradi
 * (env validation + F1 DB rol/append-only assertion + Redis connection —
 * HAMMASI `app.init()` ichida, qo'shimcha kod YOZILMAGAN) va keyin bir
 * nechta QO'SHIMCHA, real tashqi mutatsiya QILMAYDIGAN tekshiruv qiladi:
 *
 *   1. Boot muvaffaqiyatli (env/DB rol/Redis — implicit, yuqorida)
 *   2. PAYMENT_PROVIDER production uchun xavfsiz (TEST emas)
 *   3. Migratsiyalar joriy (`prisma migrate status`)
 *   4. financial:check (CRITICAL anomaliya yo'q)
 *
 * Real Payme/Redis'ga HECH QANDAY yozuvchi/tranzaksiya chaqiruvi YO'Q.
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
