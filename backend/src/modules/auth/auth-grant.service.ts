import { Injectable } from '@nestjs/common';
import type { OtpPurpose } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { UnauthenticatedError } from '@/common/errors/domain-error';
import { generateOpaqueToken, hashOpaqueToken } from '@/common/security/opaque-token.util';
import { AUTH_GRANT_TTL_SECONDS } from './constants/otp.constants';

/**
 * Bosqich 21 — OTP tasdiqlangandan KEYIN, yakuniy amal (User yaratish /
 * parolni almashtirish) bajarilgunga qadar berilgan qisqa umrli, bir
 * martalik "grant". OTP kodining O'ZI frontendda qayta ishlatilmaydi.
 *
 * `RefreshTokenService`/`StaffAuthService` bilan bir xil naqsh: xom token
 * DB'da SAQLANMAYDI (faqat SHA-256 — `hashOpaqueToken`, past-entropiyali
 * SIR EMAS, qidiruv AYNAN shu hash bo'yicha bo'lgani uchun argon2id shart
 * emas), `consumedAt` CAS bilan bir martalik iste'mol qilinadi (10 ta
 * parallel `/register/complete` bir xil token bilan FAQAT bittasini
 * o'tkazadi — lekin haqiqiy "bitta User" kafolati baribir DB `User.phone`
 * unique constraint'idan keladi, chunki HAR XIL token bilan HAM faqat
 * bitta muvaffaqiyatli create bo'lishi kerak, bo'lim 23'ga qarang).
 */
@Injectable()
export class AuthGrantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
  ) {}

  async issue(purpose: OtpPurpose, phone: string, userId?: string): Promise<string> {
    const raw = generateOpaqueToken();
    await this.prisma.authGrant.create({
      data: {
        id: this.ids.next(),
        purpose,
        phone,
        userId,
        tokenHash: hashOpaqueToken(raw),
        expiresAt: new Date(Date.now() + AUTH_GRANT_TTL_SECONDS * 1000),
      },
    });
    return raw;
  }

  /**
   * Grant'ni bir martalik iste'mol qiladi va bog'langan `phone`/`userId`ni
   * qaytaradi. Topilmasa/eskirgan/allaqachon ishlatilgan bo'lsa — bitta
   * generic xato (`TOKEN_EXPIRED`, mavjud kod, duplikat taksonomiya
   * yaratilmadi) — chaqiruvchi "sabab nima edi"ni bilishi shart emas,
   * har doim "qaytadan boshlang" degan natija.
   */
  async consume(rawToken: string, purpose: OtpPurpose): Promise<{ phone: string; userId: string | null }> {
    const tokenHash = hashOpaqueToken(rawToken);
    const grant = await this.prisma.authGrant.findFirst({
      where: { tokenHash, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!grant) {
      throw new UnauthenticatedError('Muddati tugagan yoki noto‘g‘ri so‘rov — qaytadan boshlang', 'TOKEN_EXPIRED');
    }

    // CAS — parallel `complete` so'rovlari bo'lsa, grant FAQAT BIR marta iste'mol qilinsin.
    const consumed = await this.prisma.authGrant.updateMany({
      where: { id: grant.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new UnauthenticatedError('Muddati tugagan yoki noto‘g‘ri so‘rov — qaytadan boshlang', 'TOKEN_EXPIRED');
    }

    return { phone: grant.phone, userId: grant.userId };
  }
}
