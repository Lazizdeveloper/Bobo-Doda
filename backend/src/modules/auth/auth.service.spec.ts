import { Prisma, type User } from '@prisma/client';
import { AuthService } from './auth.service';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import type { IdFactory } from '@/common/id/id.factory';
import type { OtpService } from './otp.service';
import type { TokenService } from './token.service';
import type { RefreshTokenService } from './refresh-token.service';
import { DomainError } from '@/common/errors/domain-error';

/**
 * Bosqich 20 — LOGIN va REGISTER ajratilishining IZOLYATSIYALANGAN (real
 * Postgres/Redis'siz) birligi testlari. Haqiqiy DB'dagi race-safety/
 * konkurrensiya `test/auth.e2e-spec.ts`da (real unique constraint kerak —
 * fake bilan haqiqiy race sinalmaydi); bu yerda faqat `AuthService.login`/
 * `register`ning O'Z filial mantig'i: LOGIN hech qachon User yaratmasin,
 * REGISTER hech qachon mavjudiga ustidan yozmasin va P2002'ni to'g'ri
 * `PHONE_EXISTS`ga tarjima qilsin (boshqa xatoni esa qayta tashlasin).
 */

/** `AuthService` faqat `id`/`roleChosen`/`profileDone`/`lastActiveRole`ni
    o'qiydi — qolgan `User` maydonlarini to'liq takrorlash shart emas. */
function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    phone: '+998901234567',
    roleChosen: false,
    profileDone: false,
    lastActiveRole: null,
    ...overrides,
  } as unknown as User;
}

function buildService(opts: {
  findUniqueResult?: User | null;
  createImpl?: () => Promise<User>;
}) {
  const findUnique = jest.fn(async () => opts.findUniqueResult ?? null);
  const create = jest.fn(opts.createImpl ?? (async () => fakeUser()));
  const prisma = { user: { findUnique, create } } as unknown as PrismaService;
  const ids = { next: jest.fn(() => 'new-id') } as unknown as IdFactory;
  const otp = {
    verifyOtp: jest.fn(async (phone: string) => ({ phone })),
  } as unknown as OtpService;
  const tokens = {
    signAccessToken: jest.fn(() => 'access-token'),
  } as unknown as TokenService;
  const refreshTokens = {
    // `issueSession` yakuniy `activeRole`ni SO'ROVDAGI emas, QAYTGAN
    // `record`dan o'qiydi (DB yozuvi — haqiqiy manba) — fake shuni aks
    // ettirib, berilgan qiymatni orqaga qaytarishi SHART.
    issue: jest.fn(async (params: { activeRole: string | null }) => ({
      raw: 'refresh-raw',
      record: { familyId: 'fam-1', activeRole: params.activeRole },
    })),
  } as unknown as RefreshTokenService;

  const service = new AuthService(prisma, ids, otp, tokens, refreshTokens);
  return { service, prisma, otp, findUnique, create };
}

describe('AuthService — LOGIN/REGISTER ajratilishi', () => {
  describe('login', () => {
    it('mavjud telefon — sessiya qaytaradi, User.create HECH QACHON chaqirilmaydi', async () => {
      const existing = fakeUser({ roleChosen: true, lastActiveRole: 'BUYER', profileDone: true });
      const { service, create, otp } = buildService({ findUniqueResult: existing });

      const result = await service.login('+998901234567', '123456');

      expect(result.isNewUser).toBe(false);
      expect(result.activeRole).toBe('BUYER');
      expect(result.roleChosen).toBe(true);
      expect(result.accessToken).toBe('access-token');
      expect(otp.verifyOtp).toHaveBeenCalledWith('+998901234567', '123456', 'LOGIN');
      expect(create).not.toHaveBeenCalled();
    });

    it('mavjud bo‘lmagan telefon — USER_NOT_FOUND, User HECH QACHON yaratilmaydi', async () => {
      const { service, create } = buildService({ findUniqueResult: null });

      await expect(service.login('+998901234567', '123456')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      });
      expect(create).not.toHaveBeenCalled();
    });

    it('rol hali tanlanmagan foydalanuvchi — activeRole null qaytadi', async () => {
      const existing = fakeUser({ roleChosen: false });
      const { service } = buildService({ findUniqueResult: existing });

      const result = await service.login('+998901234567', '123456');
      expect(result.activeRole).toBeNull();
      expect(result.roleChosen).toBe(false);
    });
  });

  describe('register', () => {
    it('yangi telefon — User yaratiladi, isNewUser=true, activeRole=null', async () => {
      const created = fakeUser({ id: 'new-id' });
      const { service, create, otp } = buildService({ createImpl: async () => created });

      const result = await service.register('+998901234567', '123456');

      expect(result.isNewUser).toBe(true);
      expect(result.activeRole).toBeNull();
      expect(result.roleChosen).toBe(false);
      expect(otp.verifyOtp).toHaveBeenCalledWith('+998901234567', '123456', 'REGISTER');
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({ phone: '+998901234567', verified: true, roles: [] }),
      });
    });

    it('allaqachon mavjud telefon (P2002) — PHONE_EXISTS, faqat BITTA create urinishi', async () => {
      const { service, create } = buildService({
        createImpl: async () => {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          });
        },
      });

      await expect(service.register('+998901234567', '123456')).rejects.toMatchObject({
        code: 'PHONE_EXISTS',
      });
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('P2002 DAN BOSHQA Prisma xatosi — PHONE_EXISTS bilan yutilmaydi, qayta tashlanadi', async () => {
      const { service } = buildService({
        createImpl: async () => {
          throw new Prisma.PrismaClientKnownRequestError('Foreign key violation', {
            code: 'P2003',
            clientVersion: 'test',
          });
        },
      });

      await expect(service.register('+998901234567', '123456')).rejects.not.toMatchObject({
        code: 'PHONE_EXISTS',
      });
    });

    it('OTP yaroqsiz bo‘lsa User HECH QACHON yaratilmaydi', async () => {
      const { service, create, otp } = buildService({});
      (otp.verifyOtp as jest.Mock).mockRejectedValueOnce(new DomainError('INVALID_CODE', "Kod noto'g'ri"));

      await expect(service.register('+998901234567', '000000')).rejects.toMatchObject({
        code: 'INVALID_CODE',
      });
      expect(create).not.toHaveBeenCalled();
    });
  });
});
