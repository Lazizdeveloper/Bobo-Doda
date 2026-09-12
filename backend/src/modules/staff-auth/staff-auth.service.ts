import { Injectable } from '@nestjs/common';
import type { StaffMember } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { HashService } from '@/common/security/hash.service';
import { AppConfigService } from '@/config/app-config.service';
import { generateOpaqueToken, hashOpaqueToken } from '@/common/security/opaque-token.util';
import { verifyTotp } from '@/common/security/totp.util';
import { parseDurationMs } from '@/common/security/duration.util';
import { DomainError, ForbiddenError, UnauthenticatedError } from '@/common/errors/domain-error';
import { TokenService } from '@/modules/auth/token.service';
import type { RequestMeta } from '@/modules/auth/refresh-token.service';

export interface StaffAuthResult {
  accessToken: string;
  refreshToken: string;
  staff: StaffMember;
}

/**
 * Staff (admin panel) auth — marketplace `AuthService`dan MUSTAQIL:
 * email+parol (Argon2id) + ixtiyoriy TOTP 2FA. Sessiya modeli oddiyroq
 * (`StaffSession.tokenHash` — bitta opaque token butun 8 soat davomida,
 * ROTATSIYA yo'q — `schema.prisma`dagi izohga qarang: marketplace darajasidagi
 * reuse-detection talab qilinmagan, chunki staff soni kam va operatorlar
 * tomonidan nazorat qilinadi).
 */
@Injectable()
export class StaffAuthService {
  /** Email topilmaganda ham HAQIQIY argon2id hisoblash vaqtini sarflash
   * uchun — bir marta yasalib keshlanadi (timing-orqali email enumeration
   * himoyasi; qo'lda yozilgan "soxta hash" satridan FARQLI — bu format
   * doim to'g'ri, argon2 uni bemalol "to'liq" tekshiradi). */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hash.hash(generateOpaqueToken());
    return this.dummyHash;
  }

  async login(
    email: string,
    password: string,
    totpCode: string | undefined,
    meta?: RequestMeta,
  ): Promise<StaffAuthResult> {
    const member = await this.prisma.staffMember.findUnique({ where: { email } });

    // Email topilmasa ham parolni "tekshirib" vaqt sarflaymiz — timing orqali
    // "bu email bor/yo'q"ni bilib olishning oldini olish.
    const passwordOk = member
      ? await this.hash.verify(member.passwordHash, password)
      : await this.hash.verify(await this.getDummyHash(), password);
    if (!member || !passwordOk) {
      throw new UnauthenticatedError("Email yoki parol noto'g'ri", 'INVALID_CREDENTIALS');
    }

    if (!member.isActive) {
      throw new ForbiddenError('Hisob faol emas', 'ACCOUNT_BLOCKED');
    }

    if (member.mfaEnabled) {
      if (!totpCode) {
        throw new UnauthenticatedError('2FA kod talab qilinadi', 'MFA_REQUIRED');
      }
      if (!member.totpSecret || !verifyTotp(member.totpSecret, totpCode)) {
        throw new DomainError('INVALID_CODE', "2FA kod noto'g'ri");
      }
    }

    const raw = generateOpaqueToken();
    const session = await this.prisma.staffSession.create({
      data: {
        id: this.ids.next(),
        staffId: member.id,
        tokenHash: hashOpaqueToken(raw),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
        expiresAt: new Date(Date.now() + parseDurationMs(this.config.staffJwt.refreshTtl)),
      },
    });

    await this.prisma.staffMember.update({
      where: { id: member.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.tokens.signStaffAccessToken({
      sub: member.id,
      role: member.role,
      sessionId: session.id,
    });

    return { accessToken, refreshToken: raw, staff: member };
  }

  /** Sessiya (opaque token) o'zgarmaydi — faqat YANGI qisqa umrli access JWT. */
  async refresh(rawToken: string): Promise<{ accessToken: string; staff: StaffMember }> {
    const session = await this.prisma.staffSession.findUnique({
      where: { tokenHash: hashOpaqueToken(rawToken) },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthenticatedError('Sessiya tugagan', 'TOKEN_EXPIRED');
    }

    const member = await this.prisma.staffMember.findUnique({ where: { id: session.staffId } });
    if (!member || !member.isActive) {
      throw new ForbiddenError('Hisob faol emas', 'ACCOUNT_BLOCKED');
    }

    const accessToken = this.tokens.signStaffAccessToken({
      sub: member.id,
      role: member.role,
      sessionId: session.id,
    });
    return { accessToken, staff: member };
  }

  async logout(rawToken: string, staffId: string): Promise<void> {
    await this.prisma.staffSession.updateMany({
      where: { tokenHash: hashOpaqueToken(rawToken), staffId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getById(staffId: string): Promise<StaffMember> {
    return this.prisma.staffMember.findUniqueOrThrow({ where: { id: staffId } });
  }
}
