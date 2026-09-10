import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma ulanishi. Repository qatlami FAQAT shu servis orqali DB ga tegadi
 * (kod uslubi: Prisma faqat repository qatlamida).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma ulandi');
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
