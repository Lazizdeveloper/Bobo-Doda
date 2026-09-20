import { RateLimiterService } from './rate-limiter.service';
import type { RedisService } from '@/infra/redis/redis.service';

function fakeRedis(): { set: jest.Mock; eval: jest.Mock } {
  return { set: jest.fn(), eval: jest.fn() };
}

describe('RateLimiterService', () => {
  describe('cooldown', () => {
    it('SET NX muvaffaqiyatli bo‘lsa true qaytaradi', async () => {
      const client = fakeRedis();
      client.set.mockResolvedValue('OK');
      const svc = new RateLimiterService({ client } as unknown as RedisService);

      const ok = await svc.cooldown('phone:123', 60);
      expect(ok).toBe(true);
      expect(client.set).toHaveBeenCalledWith('ratelimit:cd:phone:123', '1', 'EX', 60, 'NX');
    });

    it('kalit allaqachon bor bo‘lsa (NX rad etsa) false qaytaradi', async () => {
      const client = fakeRedis();
      client.set.mockResolvedValue(null);
      const svc = new RateLimiterService({ client } as unknown as RedisService);

      expect(await svc.cooldown('phone:123', 60)).toBe(false);
    });
  });

  describe('hit', () => {
    it('Lua skript natijasidagi hisoblagichni qaytaradi', async () => {
      const client = fakeRedis();
      client.eval.mockResolvedValue(3);
      const svc = new RateLimiterService({ client } as unknown as RedisService);

      const res = await svc.hit('ip:1.2.3.4', 3600);
      expect(res).toEqual({ count: 3 });
      expect(client.eval).toHaveBeenCalledWith(
        expect.stringContaining('INCR'),
        1,
        'ratelimit:hit:ip:1.2.3.4',
        3600,
      );
    });
  });
});
