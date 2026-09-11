/**
 * Ilovani KO'TARADI (DI grafi + `app.init()` — hamma `onModuleInit`, jumladan
 * F1 rol/append-only tekshiruvi) va natijani stdout/stderr + exit code bilan
 * bildiradi. `main.ts`dan farqi — `listen()` yo'q, faqat boot muvaffaqiyati
 * kerak.
 *
 *   node -r ts-node/register/transpile-only -r tsconfig-paths/register \
 *        scripts/boot-check.ts
 *
 * `test/db-role-assertion.e2e-spec.ts` buni ALOHIDA PROCESSDA ishga
 * tushiradi — "noto'g'ri rol bilan ilova ko'tarilmaydi" degan da'voni
 * process darajasida (jest module-cache emas) isbotlash uchun.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.init();
  await app.close();
  process.stdout.write('BOOT_OK\n');
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`BOOT_FAILED: ${(err as Error).message ?? String(err)}\n`);
  process.exit(1);
});
