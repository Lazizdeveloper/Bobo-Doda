/**
 * Bo'lim 59/60 — Bosqich 10 PRODUCTION DEPLOY qadami (BIR MARTALIK, qo'lda
 * ishga tushiriladi). Bosqich 1-9 davomida yozilgan (hali PENDING turgan)
 * eski `OutboxEvent` qatorlari — Outbox worker ishga tushishi bilan
 * BIRDAN haqiqiy foydalanuvchilarga eski bildirishnomalarni yubormasligi
 * KERAK (masalan "shartnomangiz yaratildi" degan SMS oylar oldingi
 * hodisa uchun bugun kelib qolishi).
 *
 * Bu skript worker/scheduler ISHGA TUSHISHIDAN OLDIN, deploy paytida BIR
 * MARTA ishga tushiriladi: `createdAt < cutoff` bo'lgan BARCHA `PENDING`
 * qatorlarni `SKIPPED` (`lastErrorCode=HISTORICAL_BACKLOG_CUTOFF`) qilib
 * belgilaydi — ular DB'da (audit uchun) qoladi, lekin HECH QACHON
 * yetkazishga urinilmaydi. Bu — ONGLI, AUDITABLE, BIR MARTALIK operatsiya
 * (doimiy "cutoff sanasi" konfiguratsiyasi YO'Q — shu orqali ongoing claim
 * so'rovi abadiy murakkablashmaydi, bo'lim 59's "explicit migration
 * status" yechimi).
 *
 * Ishlatish (deploy paytida, worker/scheduler ko'tarilishidan OLDIN):
 *
 *   node --require ts-node/register/transpile-only \
 *        --require tsconfig-paths/register scripts/outbox-cutover.ts \
 *        [--cutoff=2026-09-13T00:00:00.000Z] [--dry-run]
 *
 * `--cutoff` berilmasa — hozirgi vaqt (skript ishga tushirilgan payt)
 * ishlatiladi (ya'ni: "hozirgacha yozilgan HAMMA PENDING qator tarixiy").
 * `--dry-run` — hech narsa YOZMAYDI, faqat nechta qator ta'sirlanishini chop etadi.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';

function parseArgs(argv: string[]): { cutoff: Date; dryRun: boolean } {
  let cutoff = new Date();
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    if (arg.startsWith('--cutoff=')) {
      const parsed = new Date(arg.slice('--cutoff='.length));
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`--cutoff: yaroqsiz sana — "${arg}"`);
      }
      cutoff = parsed;
    }
  }
  return { cutoff, dryRun };
}

async function main(): Promise<void> {
  const { cutoff, dryRun } = parseArgs(process.argv.slice(2));
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.init();
  const prisma = app.get(PrismaService);
  const ids = app.get(IdFactory);

  const candidates = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    select: { id: true, eventType: true, createdAt: true },
  });

  process.stdout.write(`Cutoff: ${cutoff.toISOString()}\n`);
  process.stdout.write(`Ta'sirlanadigan PENDING qatorlar: ${candidates.length}\n`);

  if (dryRun || candidates.length === 0) {
    await app.close();
    process.stdout.write(dryRun ? 'DRY_RUN — hech narsa yozilmadi\n' : 'OUTBOX_CUTOVER_OK (o‘zgartiriladigan qator yo‘q)\n');
    process.exit(0);
  }

  const idempotencyToken = ids.next();
  const result = await prisma.outboxEvent.updateMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    data: {
      status: 'SKIPPED',
      lastErrorCode: 'HISTORICAL_BACKLOG_CUTOFF',
      lastError: `Deploy cutover (${idempotencyToken}) — ${cutoff.toISOString()} dan oldingi tarixiy hodisa, yuborilmaydi`,
      processedAt: new Date(),
    },
  });
  await app.close();

  process.stdout.write(`SKIPPED qilingan qatorlar: ${result.count}\n`);
  process.stdout.write('OUTBOX_CUTOVER_OK\n');
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`OUTBOX_CUTOVER_ERROR: ${(err as Error).message ?? String(err)}\n`);
  process.exit(1);
});
