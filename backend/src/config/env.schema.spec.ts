import { validateEnv } from './env.schema';

const base = {
  DATABASE_URL: 'postgresql://bobododa_app:app@localhost:5432/db?schema=public',
  DATABASE_MIGRATION_URL: 'postgresql://bobododa_migrator:migrator@localhost:5432/db?schema=public',
  REDIS_URL: 'redis://localhost:6379',
};

describe('validateEnv', () => {
  it('minimal majburiy env bilan o’tadi va default’larni to’ldiradi', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.SWAGGER_ENABLED).toBe(true);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000']);
    expect(env.DATABASE_URL).toBe(base.DATABASE_URL);
  });

  it('DATABASE_URL yo’q bo’lsa xato tashlaydi (app boot bo’lmaydi)', () => {
    expect(() => validateEnv({ REDIS_URL: base.REDIS_URL })).toThrow(/DATABASE_URL/);
  });

  it('REDIS_URL yo’q bo’lsa xato tashlaydi', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: base.DATABASE_URL,
        DATABASE_MIGRATION_URL: base.DATABASE_MIGRATION_URL,
      }),
    ).toThrow(/REDIS_URL/);
  });

  it('DATABASE_MIGRATION_URL yo’q bo’lsa xato tashlaydi (A4 — rol ajratish majburiy)', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: base.DATABASE_URL, REDIS_URL: base.REDIS_URL }),
    ).toThrow(/DATABASE_MIGRATION_URL/);
  });

  it('DATABASE_MIGRATION_URL — DATABASE_URL dan alohida qiymat', () => {
    const env = validateEnv({ ...base });
    expect(env.DATABASE_MIGRATION_URL).toBe(base.DATABASE_MIGRATION_URL);
    expect(env.DATABASE_MIGRATION_URL).not.toBe(env.DATABASE_URL);
  });

  it('noto’g’ri PORT rad etiladi', () => {
    expect(() => validateEnv({ ...base, PORT: '99999' })).toThrow();
    expect(() => validateEnv({ ...base, PORT: 'abc' })).toThrow();
  });

  it('CORS_ORIGINS vergul bilan ajratilgan ro’yxatga aylanadi', () => {
    const env = validateEnv({
      ...base,
      CORS_ORIGINS: 'http://a.test, http://b.test ,http://c.test',
    });
    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test', 'http://c.test']);
  });

  it('SWAGGER_ENABLED "0"/"false" ni boolean false qiladi', () => {
    expect(validateEnv({ ...base, SWAGGER_ENABLED: '0' }).SWAGGER_ENABLED).toBe(false);
    expect(validateEnv({ ...base, SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED).toBe(false);
  });

  it('production’da SWAGGER_ENABLED=true rad etiladi (fail closed)', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }),
    ).toThrow(/SWAGGER_ENABLED/);
  });

  it('production’da SWAGGER_ENABLED=false bilan o’tadi', () => {
    const env = validateEnv({ ...base, NODE_ENV: 'production', SWAGGER_ENABLED: 'false' });
    expect(env.NODE_ENV).toBe('production');
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it('bir nechta muammoni bitta xabarda sanaydi', () => {
    try {
      validateEnv({ DATABASE_URL: 'not-a-url' });
      fail('xato kutilgan edi');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('REDIS_URL');
    }
  });
});
