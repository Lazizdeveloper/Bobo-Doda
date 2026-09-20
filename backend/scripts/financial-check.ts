/**
 * Bo'lim 48/51/77 — deploy oldi moliyaviy preflight. Butun `AppModule`ni
 * ko'taradi (`boot-check.ts` bilan bir xil naqsh) va `FinancialIntegrityService`
 * orqali BARCHA mavjud ledger/dispute integrity tekshiruvlarini (Bosqich
 * 6/7/8/9) ishga tushiradi — natijada topilgan har bir buzilish
 * `FinancialAnomaly`ga yoziladi (keyingi chaqiruvda `skipDuplicates` bilan
 * duplikat yaratilmaydi).
 *
 * Exit 0 — CRITICAL anomaliya YO'Q (toza). Exit 1 — kamida bitta CRITICAL
 * topildi YOKI scan o'zi yiqildi. CI/pre-deploy shu exit code'ga qaraydi.
 *
 *   node --require ts-node/register/transpile-only \
 *        --require tsconfig-paths/register scripts/financial-check.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { AppConfigService } from '@/config/app-config.service';
import { FinancialIntegrityService } from '@/modules/reconciliation/financial-integrity.service';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.init();
  const config = app.get(AppConfigService);
  const integrity = app.get(FinancialIntegrityService);
  const result = await integrity.scan();
  await app.close();

  process.stdout.write(`${JSON.stringify({ ...result, production: config.isProduction })}\n`);
  if (result.critical > 0) {
    process.stderr.write(`FINANCIAL_CHECK_FAILED: ${result.critical} ta CRITICAL anomaliya topildi\n`);
    process.exit(1);
  }
  process.stdout.write('FINANCIAL_CHECK_OK\n');
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`FINANCIAL_CHECK_ERROR: ${(err as Error).message ?? String(err)}\n`);
  process.exit(1);
});
