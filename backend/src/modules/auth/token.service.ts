import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { UnauthenticatedError } from '@/common/errors/domain-error';
import { AppConfigService } from '@/config/app-config.service';
import type { AccessTokenPayload, StaffAccessTokenPayload } from './types/token-payload';

/** Env'dan keladigan "15m"/"30d" satri — `jsonwebtoken`ning branded
 * `StringValue` tipiga formatimiz allaqachon mos (`duration.util.ts`
 * regexi bilan bir xil qoida), shuning uchun aniq cast qilamiz. */
function asExpiresIn(spec: string): SignOptions['expiresIn'] {
  return spec as SignOptions['expiresIn'];
}

/**
 * JWT imzolash/tekshirish — marketplace VA staff uchun BITTA `JwtService`
 * (global konfiguratsiyasiz), har chaqiruvda `secret`/`expiresIn` ANIQ
 * beriladi. Shu sababli ikkita alohida `JwtModule.register()` shart emas —
 * sirlar `AppConfigService.jwt` / `.staffJwt`dan keladi (ADR-04 izolyatsiyasi
 * shu YERDA, kodda, saqlanadi: ikki metod ikki SIRni ishlatadi).
 *
 * Refresh token BU YERDA YO'Q — u opaque (`opaque-token.util.ts`),
 * imzolanmaydi, `RefreshTokenService`/`StaffAuthService` DB orqali boshqaradi.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    const { accessSecret, accessTtl } = this.config.jwt;
    return this.jwt.sign(payload, { secret: accessSecret, expiresIn: asExpiresIn(accessTtl) });
  }

  /** Noto'g'ri/eskirgan token — `UnauthenticatedError` (`TOKEN_EXPIRED` yoki `UNAUTHENTICATED`). */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return this.jwt.verify<AccessTokenPayload>(token, { secret: this.config.jwt.accessSecret });
    } catch (err) {
      throw toTokenError(err);
    }
  }

  signStaffAccessToken(payload: StaffAccessTokenPayload): string {
    const { accessSecret, accessTtl } = this.config.staffJwt;
    return this.jwt.sign(payload, { secret: accessSecret, expiresIn: asExpiresIn(accessTtl) });
  }

  verifyStaffAccessToken(token: string): StaffAccessTokenPayload {
    try {
      return this.jwt.verify<StaffAccessTokenPayload>(token, {
        secret: this.config.staffJwt.accessSecret,
      });
    } catch (err) {
      throw toTokenError(err);
    }
  }
}

function toTokenError(err: unknown): UnauthenticatedError {
  const name = err instanceof Error ? err.name : '';
  if (name === 'TokenExpiredError') {
    return new UnauthenticatedError('Token muddati tugagan', 'TOKEN_EXPIRED');
  }
  return new UnauthenticatedError('Token yaroqsiz', 'UNAUTHENTICATED');
}
