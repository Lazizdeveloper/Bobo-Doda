import { Injectable } from '@nestjs/common';
import { RedisService } from '@/infra/redis/redis.service';

/**
 * Redis'ga asoslangan rate limiter — yangi kutubxona (masalan
 * `@nestjs/throttler`) qo'shmasdan, ALLAQACHON birinchi darajali bog'liqlik
 * bo'lgan `RedisService`dan foydalanadi (overengineering emas).
 *
 * Ikki naqsh:
 *   • `cooldown()` — "shu vaqtgacha yana qila olmaysiz" (masalan OTP qayta
 *     yuborish). `SET NX EX` — atomik, faqat BITTA so'rov "g'olib" chiqadi.
 *   • `hit()` — sobit oyna hisoblagichi (masalan "kuniga 10 ta"). Lua skript
 *     orqali INCR+EXPIRE ATOMIK — ikki alohida buyruq bo'lganda EXPIRE
 *     o'rnatilmasdan qolib ketish yoki qayta-qayta yangilanish xavfi bor edi.
 */
@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  /**
   * `true` — hozir ruxsat berilgan (va kalit `seconds`ga o'rnatildi).
   * `false` — hali sovimagan (kimdir oldin muvaffaqiyatli chaqirgan).
   */
  async cooldown(key: string, seconds: number): Promise<boolean> {
    const res = await this.redis.client.set(`ratelimit:cd:${key}`, '1', 'EX', seconds, 'NX');
    return res === 'OK';
  }

  /** Sobit oynadagi hisoblagichni oshiradi. `count` — shu oynadagi jami urinish. */
  async hit(key: string, windowSeconds: number): Promise<{ count: number }> {
    const count = (await this.redis.client.eval(
      `local c = redis.call('INCR', KEYS[1])
       if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       return c`,
      1,
      `ratelimit:hit:${key}`,
      windowSeconds,
    )) as number;
    return { count };
  }
}
