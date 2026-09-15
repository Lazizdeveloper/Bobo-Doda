import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { AuthIntent } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { HashService } from '@/common/security/hash.service';
import { RateLimiterService } from '@/common/security/rate-limiter.service';
import { generateOtpCode } from '@/common/security/otp-code.util';
import { normalizePhone } from '@/common/security/phone.util';
import { DomainError } from '@/common/errors/domain-error';
import { OTP_SMS_QUEUE, type OtpSmsJobData } from '@/infra/sms/otp-sms.processor';
import {
  OTP_EXPIRY_SECONDS,
  OTP_IP_HOURLY_LIMIT,
  OTP_IP_HOURLY_WINDOW_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_PHONE_DAILY_LIMIT,
  OTP_PHONE_DAILY_WINDOW_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_SMS_TEMPLATE,
} from './constants/otp.constants';

/**
 * OTP so'rash/tasdiqlash — telefon+OTP autentifikatsiyasining yuragi.
 *
 * `requestOtp` ATAYLAB `User` jadvaliga UMUMAN tegmaydi — shu bilan
 * enumeration-safe: ro'yxatdan o'tgan yoki o'tmagan telefon uchun bir xil
 * javob (controller ham bir xil generic xabar qaytaradi). Foydalanuvchini
 * yaratish/topish qarori `verifyOtp`dan KEYIN, `AuthService`da (bu servis
 * faqat OTP haqiqiyligini biladi, User haqida qaror qabul qilmaydi —
 * bitta mas'uliyat).
 *
 * Bosqich 20 — `intent` (LOGIN | REGISTER) HAR bir challenge'ga bog'lanadi:
 * LOGIN uchun so'ralgan kod REGISTER'ni tasdiqlay olmaydi va aksincha
 * (`verifyOtp`ning `WHERE`i `intent`ni ham talab qiladi — boshqa intent
 * uchun yaratilgan qator UMUMAN topilmaydi, xuddi mavjud bo'lmagandek).
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly hash: HashService,
    private readonly limiter: RateLimiterService,
    @InjectQueue(OTP_SMS_QUEUE) private readonly smsQueue: Queue<OtpSmsJobData>,
  ) {}

  async requestOtp(rawPhone: string, intent: AuthIntent, ip?: string): Promise<void> {
    const phone = normalizePhone(rawPhone);

    // Cooldown INTENT bo'yicha ajratilgan — "hisob topilmadi/mavjud" CTA'dan
    // keyin foydalanuvchi ikkinchi oqimga darhol o'tishi kerak (60s kutmasdan).
    // Kunlik/IP chegara esa ATAYLAB umumiy (pastga qarang) — aks holda bitta
    // telefon LOGIN+REGISTER orasida almashtirib jami SMS hajmini ikki
    // baravar oshirardi (xavfsizlik siyosati zaiflashmasin degan talab).
    const cooldownOk = await this.limiter.cooldown(
      `otp:cooldown:${phone}:${intent}`,
      OTP_RESEND_COOLDOWN_SECONDS,
    );
    if (!cooldownOk) {
      throw new DomainError('RATE_LIMITED', "Qayta so'rashdan oldin biroz kuting");
    }

    const perPhoneDay = await this.limiter.hit(`otp:day:${phone}`, OTP_PHONE_DAILY_WINDOW_SECONDS);
    if (perPhoneDay.count > OTP_PHONE_DAILY_LIMIT) {
      throw new DomainError('RATE_LIMITED', "Bugungi so'rovlar chegarasiga yetdingiz");
    }

    if (ip) {
      const perIpHour = await this.limiter.hit(`otp:ip:${ip}`, OTP_IP_HOURLY_WINDOW_SECONDS);
      if (perIpHour.count > OTP_IP_HOURLY_LIMIT) {
        throw new DomainError('RATE_LIMITED', "So'rovlar chegarasiga yetdingiz");
      }
    }

    const code = generateOtpCode();
    await this.prisma.otpCode.create({
      data: {
        id: this.ids.next(),
        phone,
        intent,
        codeHash: await this.hash.hash(code),
        ip,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
      },
    });

    // BullMQ orqali — OutboxEvent EMAS (`otp-sms.processor.ts` izohiga qarang:
    // OTP xom holda Postgres'ga yozilmasin).
    await this.smsQueue.add('send', { phone, code, template: OTP_SMS_TEMPLATE });
  }

  /** Muvaffaqiyatli bo'lsa normallashtirilgan telefonni qaytaradi. */
  async verifyOtp(rawPhone: string, code: string, intent: AuthIntent): Promise<{ phone: string }> {
    const phone = normalizePhone(rawPhone);

    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, intent, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new DomainError('INVALID_CODE', "Kod noto'g'ri yoki muddati tugagan");
    }

    const valid = await this.hash.verify(otp.codeHash, code);
    if (!valid) {
      const attempts = otp.attempts + 1;
      const burned = attempts >= OTP_MAX_ATTEMPTS;
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts, ...(burned ? { consumedAt: new Date() } : {}) },
      });
      throw new DomainError('INVALID_CODE', "Kod noto'g'ri");
    }

    // CAS — parallel `verify` so'rovlari bo'lsa, kod FAQAT BIR marta iste'mol qilinsin.
    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new DomainError('INVALID_CODE', 'Kod allaqachon ishlatilgan');
    }

    return { phone };
  }
}
