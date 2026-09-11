import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '@/config/app-config.service';
import { assertDbRoleHardening } from './db-role-assertion';

/**
 * Prisma ulanishi. Repository qatlami FAQAT shu servis orqali DB ga tegadi
 * (kod uslubi: Prisma faqat repository qatlamida).
 *
 * `onModuleInit` — `$connect` dan keyin F1 tekshiruvini ishga tushiradi:
 * rol noto'g'ri yoki append-only buzilgan bo'lsa, `/health/ready` javob
 * berishidan OLDIN ilova ko'tarilishdan bosh tortadi (`db-role-assertion.ts`).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: AppConfigService) {
    super({ log: [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma ulandi');

    await assertDbRoleHardening(this, {
      enabled: this.config.dbRoleAssertionEnabled,
      logger: this.logger,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** `/health/ready` uchun yengil tekshiruv. */
  async ping(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
