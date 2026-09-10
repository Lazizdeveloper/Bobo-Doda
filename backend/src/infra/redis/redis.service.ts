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
 * `onModuleInit` ulanishni QAYTA URINISH bilan kutadi (qat'iy 15s deadline):
 * API Redis'dan oldin ko'tarilishi mumkin (Docker/K8s). MUHIM: har urinish
 * `Promise.race` bilan cheklangan — `maxRetriesPerRequest: null` + offline
 * queue tufayli `ping()` o'zi hech qachon rad etmaydi, shuning uchun deadline
 * faqat race bilan majburlanadi (aks holda boot abadiy osilib qoladi).
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
      connectTimeout: 5_000,
      retryStrategy: (times) => Math.min(times * 200, 2_000),
    });
    // Qayta ulanish paytida ham 'error' chiqadi — kutilgan, ERROR emas.
    this.client.on('error', (err: Error) => {
      this.logger.debug(`Redis (qayta ulanish): ${err.message || err.name}`);
    });
  }

  async onModuleInit(): Promise<void> {
    const deadline = Date.now() + 20_000;
    let lastErr: unknown;
    while (Date.now() < deadline) {
      try {
        await withTimeout(this.connectAndPing(), 5_000);
        this.logger.log('Redis ulandi');
        return;
      } catch (err) {
        lastErr = err;
        await sleep(500);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Redis ulanmadi (timeout)');
  }

  private async connectAndPing(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'end') {
      await this.client.connect();
    }
    const pong: string = await this.client.ping();
    if (pong !== 'PONG') throw new Error(`kutilmagan PING javobi: ${pong}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }

  /** `/health/ready` uchun. */
  async ping(): Promise<boolean> {
    const pong = await withTimeout(this.client.ping(), 2_000).catch(() => null);
    return pong === 'PONG';
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
