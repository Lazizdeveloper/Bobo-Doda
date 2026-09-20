import type { Queue } from 'bullmq';
import { OtpService } from './otp.service';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import type { IdFactory } from '@/common/id/id.factory';
import type { HashService } from '@/common/security/hash.service';
import type { RateLimiterService } from '@/common/security/rate-limiter.service';
import type { AppConfigService } from '@/config/app-config.service';
import type { OtpSmsJobData } from '@/infra/sms/otp-sms.processor';

/**
 * Bosqich 22 — `OtpService.requestOtp`ning `devOtp` (dev-only kod ochish)
 * ulanishi: real Prisma/Redis/BullMQ SIZ, faqat `config.isProduction` /
 * `config.sms` qiymatlarini o'zgartirib `shouldExposeDevOtp()` orqali
 * to'g'ri qaror qabul qilinishini tekshiradi. Taksonomiya (`OTP_EXPIRED`/
 * `OTP_ATTEMPTS_EXCEEDED`) — haqiqiy DB qator holati kerak bo'lgani uchun
 * `test/auth.e2e-spec.ts`da (real Postgres) tekshiriladi, bu yerda EMAS.
 */
function buildOtpService(opts: {
  isProduction?: boolean;
  smsProvider?: 'CONSOLE' | 'PLAYMOBILE';
  devExposeOtp?: boolean;
}) {
  const prisma = {
    otpCode: { create: jest.fn(async () => undefined) },
  } as unknown as PrismaService;
  const ids = { next: jest.fn(() => 'otp-id-1') } as unknown as IdFactory;
  const hash = { hash: jest.fn(async (plain: string) => `hashed:${plain}`) } as unknown as HashService;
  const limiter = {
    cooldown: jest.fn(async () => true),
    hit: jest.fn(async () => ({ count: 1 })),
  } as unknown as RateLimiterService;
  const config = {
    isProduction: opts.isProduction ?? false,
    sms: { provider: opts.smsProvider ?? 'CONSOLE', devExposeOtp: opts.devExposeOtp ?? false },
  } as unknown as AppConfigService;
  const smsQueue = { add: jest.fn(async () => undefined) } as unknown as Queue<OtpSmsJobData>;

  return new OtpService(prisma, ids, hash, limiter, config, smsQueue);
}

describe('OtpService.requestOtp — devOtp (Bosqich 22)', () => {
  it('development + CONSOLE + DEV_EXPOSE_OTP=true → javobda devOtp (6 xonali) bor', async () => {
    const service = buildOtpService({ isProduction: false, smsProvider: 'CONSOLE', devExposeOtp: true });
    const res = await service.requestOtp('+998901234567', 'REGISTER');
    expect(res.devOtp).toMatch(/^\d{6}$/);
  });

  it('development + CONSOLE + DEV_EXPOSE_OTP=false → devOtp yo‘q', async () => {
    const service = buildOtpService({ isProduction: false, smsProvider: 'CONSOLE', devExposeOtp: false });
    const res = await service.requestOtp('+998901234567', 'REGISTER');
    expect(res.devOtp).toBeUndefined();
  });

  it('development + PLAYMOBILE (devExposeOtp=true bo‘lsa ham) → devOtp yo‘q', async () => {
    const service = buildOtpService({ isProduction: false, smsProvider: 'PLAYMOBILE', devExposeOtp: true });
    const res = await service.requestOtp('+998901234567', 'REGISTER');
    expect(res.devOtp).toBeUndefined();
  });

  it('production + CONSOLE + DEV_EXPOSE_OTP=true → devOtp yo‘q (production HAR DOIM yutadi)', async () => {
    const service = buildOtpService({ isProduction: true, smsProvider: 'CONSOLE', devExposeOtp: true });
    const res = await service.requestOtp('+998901234567', 'REGISTER');
    expect(res.devOtp).toBeUndefined();
  });

  it('production + PLAYMOBILE + DEV_EXPOSE_OTP=true → devOtp yo‘q', async () => {
    const service = buildOtpService({ isProduction: true, smsProvider: 'PLAYMOBILE', devExposeOtp: true });
    const res = await service.requestOtp('+998901234567', 'REGISTER');
    expect(res.devOtp).toBeUndefined();
  });

  it('skipDelivery=true (PASSWORD_RESET, noma’lum telefon) → devOtp yo‘q, kod umuman yaratilmaydi', async () => {
    const service = buildOtpService({ isProduction: false, smsProvider: 'CONSOLE', devExposeOtp: true });
    const res = await service.requestOtp('+998901234567', 'PASSWORD_RESET', { skipDelivery: true });
    expect(res).toEqual({});
  });
});
