import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { OtpPurpose } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { HashService } from '@/common/security/hash.service';
import { RateLimiterService } from '@/common/security/rate-limiter.service';
import { AppConfigService } from '@/config/app-config.service';
import { generateOtpCode } from '@/common/security/otp-code.util';
import { normalizePhone } from '@/common/security/phone.util';
import { DomainError } from '@/common/errors/domain-error';
import { OTP_SMS_QUEUE, type OtpSmsJobData } from '@/infra/sms/otp-sms.processor';
import { shouldExposeDevOtp } from './dev-otp.util';
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
 * OTP so'rash/tasdiqlash — telefon egaligini isbotlashning yuragi.
 * Bosqich 21 — oddiy LOGIN endi parol bilan (`AuthService.login`), bu servis
 * UMUMAN ishtirok etmaydi. OTP FAQAT ikki maqsadda: REGISTER (yangi hisob)
 * va PASSWORD_RESET (parolni tiklash).
 *
 * `requestOtp` ATAYLAB `User` jadvaliga UMUMAN tegmaydi — shu bilan
 * enumeration-safe: ro'yxatdan o'tgan yoki o'tmagan telefon uchun bir xil
 * javob (controller ham bir xil generic xabar qaytaradi). Foydalanuvchini
 * yaratish/topish qarori bu servisdan TASHQARIDA, `AuthService`da (bu servis
 * faqat OTP haqiqiyligini biladi, User haqida qaror qabul qilmaydi — bitta
 * mas'uliyat). PASSWORD_RESET uchun "SMS haqiqatan yuborilsinmi" qarori
 * ham `AuthService` tomonidan `skipDelivery` orqali beriladi (bo'lim
 * 16 — noma'lum telefon uchun SMS xarajatini tejash, lekin rate-limit
 * baribir TO'LIQ ishlaydi — pastga qarang).
 *
 * `purpose` (REGISTER | PASSWORD_RESET) HAR bir challenge'ga bog'lanadi:
 * REGISTER uchun so'ralgan kod PASSWORD_RESET'ni tasdiqlay olmaydi va
 * aksincha (`verifyOtp`ning `WHERE`i `purpose`ni ham talab qiladi — boshqa
 * maqsad uchun yaratilgan qator UMUMAN topilmaydi, xuddi mavjud bo'lmagandek).
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly hash: HashService,
    private readonly limiter: RateLimiterService,
    private readonly config: AppConfigService,
    @InjectQueue(OTP_SMS_QUEUE) private readonly smsQueue: Queue<OtpSmsJobData>,
  ) {}

  /**
   * `skipDelivery` — `true` bo'lsa, RATE LIMIT BARIBIR TO'LIQ qo'llanadi
   * (aks holda noma'lum telefon uchun cheklov UMUMAN ishlamay qolib,
   * "cheklovga tegmayapti" degan o'zi bir enumeration signali bo'lardi),
   * lekin OTP qatori yaratilmaydi va SMS navbatga qo'yilmaydi — chaqiruvchi
   * (`AuthService`, PASSWORD_RESET uchun telefon mavjud emasligini
   * bilganda) shu bilan haqiqiy SMS xarajatidan qochadi. Bu — "reasonable"
   * (mukammal emas) timing-himoya: DB yozuv + navbat operatsiyasi vaqti
   * farq qiladi, lekin soxta yozuv yasash ortiqcha murakkablik bo'lardi.
   */
  async requestOtp(
    rawPhone: string,
    purpose: OtpPurpose,
    opts: { ip?: string; skipDelivery?: boolean } = {},
  ): Promise<{ devOtp?: string }> {
    const phone = normalizePhone(rawPhone);
    const { ip, skipDelivery = false } = opts;

    // Cooldown MAQSAD bo'yicha ajratilgan — masalan parolni tiklashdan
    // keyin darhol ro'yxatdan o'tishga urinish 60s kutmasdan ishlashi
    // kerak. Kunlik/IP chegara esa ATAYLAB umumiy (pastga qarang) — aks
    // holda bitta telefon REGISTER+PASSWORD_RESET orasida almashtirib
    // jami SMS hajmini ikki baravar oshirardi.
    const cooldownOk = await this.limiter.cooldown(
      `otp:cooldown:${phone}:${purpose}`,
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

    if (skipDelivery) return {};

    const code = generateOtpCode();
    await this.prisma.otpCode.create({
      data: {
        id: this.ids.next(),
        phone,
        purpose,
        codeHash: await this.hash.hash(code),
        ip,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
      },
    });

    // BullMQ orqali — OutboxEvent EMAS (`otp-sms.processor.ts` izohiga qarang:
    // OTP xom holda Postgres'ga yozilmasin). `purpose` — Bosqich 23,
    // provider REGISTER/PASSWORD_RESET matnini farqlashi uchun.
    await this.smsQueue.add('send', { phone, code, template: OTP_SMS_TEMPLATE, purpose });

    // Bosqich 22 — FAQAT lokal dev qulayligi (`dev-otp.util.ts`). Kodning
    // o'zi HECH QACHON qayta o'qilmaydi (`codeHash` bir tomonlama) — shuning
    // uchun bu yerda, hali xotirada turgan `code`dan qaror qilinishi shart.
    const devOtp = shouldExposeDevOtp({
      isProduction: this.config.isProduction,
      smsProvider: this.config.sms.provider,
      devExposeOtp: this.config.sms.devExposeOtp,
    })
      ? code
      : undefined;
    return devOtp ? { devOtp } : {};
  }

  /**
   * Muvaffaqiyatli bo'lsa normallashtirilgan telefonni qaytaradi.
   *
   * Bosqich 22 — xato taksonomiyasi ATAYLAB uch holatga ajratilgan (ilgari
   * hammasi bitta `INVALID_CODE`ga tushardi, UI "noto'g'ri format" bilan
   * "noto'g'ri kod"ni farqlay olmasdi):
   *   • `INVALID_CODE` — bunday challenge UMUMAN topilmadi (hech qachon
   *     so'ralmagan / boshqa `purpose` / allaqachon iste'mol qilingan) YOKI
   *     kod noto'g'ri kiritildi. Ataylab BIR XIL kod — enumeration-safe
   *     (topilmadi va noto'g'ri farqlansa, "bu telefon uchun challenge bor/
   *     yo'q" signali chiqib qolardi).
   *   • `OTP_EXPIRED` — qator topildi, lekin muddati o'tgan.
   *   • `OTP_ATTEMPTS_EXCEEDED` — urinishlar soni tugagan (yangi kod olish
   *     kerakligini aniq aytadi — "yana urinib ko'ring" chalg'ituvchi bo'lardi).
   */
  async verifyOtp(rawPhone: string, code: string, purpose: OtpPurpose): Promise<{ phone: string }> {
    const phone = normalizePhone(rawPhone);

    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new DomainError('INVALID_CODE', "Kod noto'g'ri");
    }
    if (otp.expiresAt <= new Date()) {
      throw new DomainError('OTP_EXPIRED', 'Kodning amal qilish muddati tugagan');
    }
    // Himoya qatlami: odatda oxirgi noto'g'ri urinishning o'zi (pastda)
    // darhol `consumedAt`ni belgilaydi, shuning uchun bu shart amalda
    // deyarli hech qachon ishga tushmaydi — lekin CAS'siz holat qolib
    // ketsa ham keyingi urinish baribir bloklanadi.
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new DomainError('OTP_ATTEMPTS_EXCEEDED', "Urinishlar soni oshib ketdi. Yangi kod oling.");
    }

    const valid = await this.hash.verify(otp.codeHash, code);
    if (!valid) {
      const attempts = otp.attempts + 1;
      const burned = attempts >= OTP_MAX_ATTEMPTS;
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts, ...(burned ? { consumedAt: new Date() } : {}) },
      });
      if (burned) {
        throw new DomainError('OTP_ATTEMPTS_EXCEEDED', "Urinishlar soni oshib ketdi. Yangi kod oling.");
      }
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
