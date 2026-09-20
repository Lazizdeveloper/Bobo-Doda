/**
 * OpenAPI hujjatini faylga chiqaradi — `@bobododa/contracts` generatsiyasi
 * uchun (`packages/contracts/scripts/generate.mjs` chaqiradi).
 *
 *   node -r ts-node/register/transpile-only -r tsconfig-paths/register \
 *        scripts/emit-openapi.ts <output-path>
 *
 * Nest ilovasi DI grafini quradi, lekin `app.init()` / `app.listen()`
 * CHAQIRILMAYDI — shuning uchun `onModuleInit` hook'lari (Prisma `$connect`,
 * Redis `connect`) ishlamaydi va DB/Redis KERAK EMAS. `SwaggerModule`
 * hujjatni faqat controller/route metadata'sidan quradi.
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '@/app.module';

async function main(): Promise<void> {
  const outPath = resolve(process.argv[2] ?? 'openapi.json');

  const app = await NestFactory.create(AppModule, { logger: ['error'] });

  const config = new DocumentBuilder()
    .setTitle('Bobo&Doda API')
    .setDescription(
      'Markaziy Osiyo freelance marketplace — milestone escrow, double-entry ledger. ' +
        'Frontend `lib/api` chegarasini qoplaydi.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  document.openapi = '3.1.0';

  writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n');
  process.stdout.write(`[emit-openapi] ${outPath}\n`);

  // `app.init()` chaqirilmagan — ochiq handle (BullMQ/ioredis reconnect
  // urinishlari) qolishi mumkin; qat'iy chiqamiz.
  await app.close().catch(() => undefined);
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`[emit-openapi] XATO: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
