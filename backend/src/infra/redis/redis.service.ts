import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '@/config/app-config.service';

/**
 * Redis ulanishi (cache + BullMQ connection). `maxRetriesPerRequest: null`
 * — BullMQ talabi.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    this.client.on('error', (err) => this.logger.error(`Redis xatosi: ${err.message}`));
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Redis ulandi');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }

  /** `/health/ready` uchun. */
  async ping(): Promise<boolean> {
    const pong = await this.client.ping();
    return pong === 'PONG';
  }
}
