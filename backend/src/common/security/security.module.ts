import { Global, Module } from '@nestjs/common';
import { HashService } from './hash.service';
import { RateLimiterService } from './rate-limiter.service';

/** Argon2id hash + Redis rate-limiter — auth/staff-auth ikkalasi ham ishlatadi. */
@Global()
@Module({
  providers: [HashService, RateLimiterService],
  exports: [HashService, RateLimiterService],
})
export class SecurityModule {}
