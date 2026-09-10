import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { ConfigModule } from '@/config/config.module';
import { LoggerModule } from '@/infra/logger/logger.module';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { RedisModule } from '@/infra/redis/redis.module';
import { QueueModule } from '@/infra/queue/queue.module';

import { AllExceptionsFilter } from '@/common/http/all-exceptions.filter';
import { LoggingInterceptor } from '@/common/http/logging.interceptor';
import { RequestIdMiddleware } from '@/common/http/request-id.middleware';

import { HealthModule } from '@/modules/health/health.module';

/**
 * Ildiz modul. Domen modullari (`auth`, `users`, `catalog`, `contracts`,
 * `ledger`, `disputes`, `admin` …) o'z bosqichlarida shu yerga qo'shiladi.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
