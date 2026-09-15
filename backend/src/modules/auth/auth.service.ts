import { Injectable } from '@nestjs/common';
import { Prisma, type AuthIntent, type Role } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '@/common/errors/domain-error';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { RefreshTokenService, type RequestMeta } from './refresh-token.service';
import type { AccessTokenPayload } from './types/token-payload';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  activeRole: Role | null;
  roleChosen: boolean;
  profileDone: boolean;
  isNewUser: boolean;
}

/**
 * Marketplace auth orkestratori — `OtpService` (kod haqiqiyligi),
 * `RefreshTokenService` (sessiya/rotatsiya) va `TokenService` (JWT)ni
 * birlashtiradi. Bitta joyda: "OTP to'g'ri bo'lsa nima qilamiz" qarori.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async requestOtp(phone: string, intent: AuthIntent, ip?: string): Promise<void> {
    await this.otp.requestOtp(phone, intent, ip);
  }

  /**
   * Bosqich 20 — LOGIN faqat MAVJUD hisobni autentifikatsiya qiladi.
   * Hech qachon `User` yaratmaydi: telefon topilmasa `USER_NOT_FOUND`
   * (frontend "Ro'yxatdan o'tishni xohlaysizmi?" CTA'sini shu bilan
   * ko'rsatadi). Bu ma'lumot faqat VALID OTP orqali telefon egaligi
   * isbotlangandan keyin beriladi — enumeration xavfsiz (`requestOtp`
   * hali ham generic javob qaytaradi).
   */
  async login(rawPhone: string, code: string, meta?: RequestMeta): Promise<AuthResult> {
    const { phone } = await this.otp.verifyOtp(rawPhone, code, 'LOGIN');

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new NotFoundError('Bu raqam bilan hisob topilmadi', 'USER_NOT_FOUND');
    }

    // Ko'p rolli qaytgan foydalanuvchi uchun oxirgi tanlangan kontekst;
    // rol hali tanlanmagan bo'lsa — `null` ("pending onboarding" sessiya).
    const activeRole = user.roleChosen ? (user.lastActiveRole ?? null) : null;

    return this.issueSession(user.id, activeRole, {
      roleChosen: user.roleChosen,
      profileDone: user.profileDone,
      isNewUser: false,
      meta,
    });
  }

  /**
   * Bosqich 20 — REGISTER foydalanuvchi yaratishning YAGONA yo'li.
   * Telefon allaqachon ro'yxatdan o'tgan bo'lsa `PHONE_EXISTS` (frontend
   * "Kirishni xohlaysizmi?" CTA'sini shu bilan ko'rsatadi) — YANGI User
   * yaratilmaydi. Race-safe: parallel so'rovlar `User.phone`dagi DB
   * darajasidagi UNIQUE cheklovga tayanadi (`findUnique`+`create` emas —
   * to'g'ridan-to'g'ri `create`, P2002'ni ushlaymiz), shuning uchun bir
   * xil telefon uchun 10 ta parallel REGISTER ham FAQAT bitta qator
   * yaratadi.
   */
  async register(rawPhone: string, code: string, meta?: RequestMeta): Promise<AuthResult> {
    const { phone } = await this.otp.verifyOtp(rawPhone, code, 'REGISTER');

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          id: this.ids.next(),
          phone,
          roles: [],
          // OTP — telefon egaligini isbotlaydi; Telegram/Google'ning o'rnini
          // bosadi (frontend'dagi "verified" bosqichi shu).
          verified: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        throw new ConflictError('PHONE_EXISTS', 'Bu raqam bilan hisob allaqachon mavjud');
      }
      throw err;
    }

    return this.issueSession(user.id, null, {
      roleChosen: false,
      profileDone: false,
      isNewUser: true,
      meta,
    });
  }

  async refresh(rawRefreshToken: string, meta?: RequestMeta): Promise<AuthResult> {
    const { raw, record } = await this.refreshTokens.rotate(rawRefreshToken, meta);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
    const accessToken = this.tokens.signAccessToken({
      sub: record.userId,
      activeRole: record.activeRole,
      familyId: record.familyId,
    });
    return {
      accessToken,
      refreshToken: raw,
      activeRole: record.activeRole,
      roleChosen: user.roleChosen,
      profileDone: user.profileDone,
      isNewUser: false,
    };
  }

  async logout(rawRefreshToken: string, userId: string): Promise<void> {
    await this.refreshTokens.revokeByRawToken(rawRefreshToken, userId);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
  }

  /** `POST /me/roles/choose` — FAQAT birinchi marta. */
  async chooseRole(current: AccessTokenPayload, role: Role): Promise<AuthResult> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: current.sub } });
    if (user.roleChosen) {
      throw new DomainError('BAD_STATE', 'Rol allaqachon tanlangan — `/me/roles/switch` dan foydalaning');
    }

    const updated = await this.prisma.user.update({
      where: { id: current.sub },
      data: { roles: { push: role }, roleChosen: true, lastActiveRole: role },
    });

    // Onboarding (rol-tanlanmagan) sessiyasini yopamiz — endi kerak emas.
    await this.refreshTokens.revokeFamily(current.familyId);

    return this.issueSession(updated.id, role, {
      roleChosen: true,
      profileDone: updated.profileDone,
      isNewUser: false,
      meta: undefined,
    });
  }

  /** `POST /me/roles/switch` — foydalanuvchi ALLAQACHON ega bo'lgan rolga. Eski sessiya BEKOR QILINMAYDI (parallel kabinet). */
  async switchRole(current: AccessTokenPayload, role: Role, meta?: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: current.sub } });
    if (!user.roles.includes(role)) {
      throw new ForbiddenError("Bu rolga ega emassiz", 'NOT_ALLOWED');
    }

    await this.prisma.user.update({
      where: { id: current.sub },
      data: { lastActiveRole: role },
    });

    return this.issueSession(user.id, role, {
      roleChosen: true,
      profileDone: user.profileDone,
      isNewUser: false,
      meta,
    });
  }

  private async issueSession(
    userId: string,
    activeRole: Role | null,
    opts: { roleChosen: boolean; profileDone: boolean; isNewUser: boolean; meta?: RequestMeta },
  ): Promise<AuthResult> {
    const { raw, record } = await this.refreshTokens.issue({ userId, activeRole, meta: opts.meta });
    const accessToken = this.tokens.signAccessToken({
      sub: userId,
      activeRole: record.activeRole,
      familyId: record.familyId,
    });
    return {
      accessToken,
      refreshToken: raw,
      activeRole: record.activeRole,
      roleChosen: opts.roleChosen,
      profileDone: opts.profileDone,
      isNewUser: opts.isNewUser,
    };
  }
}
