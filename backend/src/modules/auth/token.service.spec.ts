import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import type { AppConfigService } from '@/config/app-config.service';
import { DomainError } from '@/common/errors/domain-error';

function fakeConfig(): AppConfigService {
  return {
    jwt: { accessSecret: 'marketplace-secret-marketplace-secret-32', accessTtl: '1s', refreshTtl: '30d' },
    staffJwt: { accessSecret: 'staff-secret-staff-secret-staff-secret-32', accessTtl: '15m', refreshTtl: '8h' },
  } as unknown as AppConfigService;
}

describe('TokenService', () => {
  const svc = new TokenService(new JwtService(), fakeConfig());

  it('marketplace access token — sign/verify round-trip, claim shakli minimal', () => {
    const token = svc.signAccessToken({ sub: 'user-1', activeRole: 'BUYER', familyId: 'fam-1' });
    const payload = svc.verifyAccessToken(token);
    expect(payload).toMatchObject({ sub: 'user-1', activeRole: 'BUYER', familyId: 'fam-1' });
  });

  it('staff access token — o‘z sirlari bilan sign/verify', () => {
    const token = svc.signStaffAccessToken({ sub: 'staff-1', role: 'OPERATIONS', sessionId: 'sess-1' });
    const payload = svc.verifyStaffAccessToken(token);
    expect(payload).toMatchObject({ sub: 'staff-1', role: 'OPERATIONS', sessionId: 'sess-1' });
  });

  it('marketplace token staff verify’da RAD ETILADI — sirlar KRIPTOGRAFIK jihatdan ajratilgan', () => {
    const marketplaceToken = svc.signAccessToken({ sub: 'user-1', activeRole: null, familyId: 'fam-1' });
    expect(() => svc.verifyStaffAccessToken(marketplaceToken)).toThrow(DomainError);
  });

  it('staff token marketplace verify’da RAD ETILADI', () => {
    const staffToken = svc.signStaffAccessToken({ sub: 'staff-1', role: 'ADMIN', sessionId: 's' });
    expect(() => svc.verifyAccessToken(staffToken)).toThrow(DomainError);
  });

  it('muddati tugagan token — TOKEN_EXPIRED kodi bilan', async () => {
    const token = svc.signAccessToken({ sub: 'user-1', activeRole: null, familyId: 'fam-1' });
    await new Promise((r) => setTimeout(r, 1_100)); // accessTtl=1s
    try {
      svc.verifyAccessToken(token);
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe('TOKEN_EXPIRED');
    }
  }, 3_000);

  it('buzilgan token — UNAUTHENTICATED', () => {
    expect(() => svc.verifyAccessToken('not-a-jwt')).toThrow(DomainError);
    try {
      svc.verifyAccessToken('not-a-jwt');
    } catch (err) {
      expect((err as DomainError).code).toBe('UNAUTHENTICATED');
    }
  });
});
