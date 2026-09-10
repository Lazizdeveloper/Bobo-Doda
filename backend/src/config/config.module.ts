import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.schema';

/**
 * Global config. `validate` — Zod sxemasi; MAJBURIY env yo'q bo'lsa bu yerda
 * `Error` tashlanadi va NestFactory umuman ko'tarilmaydi.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // `.env` faqat lokal ishlab chiqishda; prod'da real env inject qilinadi.
      envFilePath: ['.env'],
      validate: validateEnv,
      expandVariables: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
