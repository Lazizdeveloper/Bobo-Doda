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
 *
 * `onModuleInit` ulanishni QAYTA URINISH bilan kutadi: API Redis'dan oldin
 * ko'tarilishi mumkin (Docker/K8s), va ba'zi muhitlarda birinchi TCP urinish
 * "Connection is closed" bilan yiqiladi (dual-stack `localhost`, konteyner
 * hali "ready" emas). Bitta urinishga tayanish flaky boot beradi.
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
      // Fon rejimida qayta ulanish kafolatlangan bo'lsin (bo'sh strategiya
      // qaytarilmaydi) — `onModuleInit` sikli shunga tayanadi.
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    // Qayta ulanish paytida ham 'error' chiqadi — bu kutilgan, ERROR emas.
    this.client.on('error', (err: Error) => {
      this.logger.debug(`Redis (qayta ulanish): ${err.message || err.name}`);
    });
  }

  async onModuleInit(): Promise<void> {
    const deadlineMs = Date.now() + 20_000;
    let lastErr: unknown;
    for (let attempt = 1; Date.now() < deadlineMs; attempt++) {
      try {
        if (this.client.status === 'wait' || this.client.status === 'end') {
          await this.client.connect();
        }
        if ((await this.client.ping()) === 'PONG') {
          this.logger.log(`Redis ulandi${attempt > 1 ? ` (${attempt}-urinish)` : ''}`);
          return;
        }
      } catch (err) {
        lastErr = err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw lastErr instanceof Error ? lastErr : new Error('Redis ulanmadi (timeout)');
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
