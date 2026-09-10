import { PrismaClient } from '@prisma/client';

/**
 * E2E infratuzilma manzillari.
 *
 * CI'da Postgres/Redis **GitHub Actions service konteynerlari** sifatida
 * ko'tariladi (Testcontainers EMAS — u ba'zi runner'larda Redis ulanishini
 * "Connection is closed" bilan yiqitardi). Lokal'da: `docker compose up -d
 * postgres redis` yoki nix-shell ichidagi throwaway klaster; superuser
 * URL'ini `E2E_SUPERUSER_URL` bilan bering.
 */
export const E2E_SUPERUSER_URL =
  process.env.E2E_SUPERUSER_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
export const E2E_REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6379';

const withConnectTimeout = (url: string, seconds: number): string =>
  url.includes('connect_timeout=') ? url : `${url}${url.includes('?') ? '&' : '?'}connect_timeout=${seconds}`;

/** DB nomini almashtiradi: `.../postgres?x` → `.../<name>?x`. */
export const withDatabase = (url: string, name: string): string =>
  url.replace(/\/[^/?]+(\?|$)/, `/${name}$1`);

/** Infra yetib bo'lmasa test o'zini o'tkazib yuboradi (lokal, xizmatlarsiz). */
export async function pgReachable(): Promise<boolean> {
  const client = new PrismaClient({ datasourceUrl: withConnectTimeout(E2E_SUPERUSER_URL, 3) });
  try {
    await client.$queryRawUnsafe('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}

/** Toza DB yaratadi (qayta ishga tushirishga chidamli). Superuser URL qaytaradi. */
export async function recreateDatabase(name: string): Promise<string> {
  const admin = new PrismaClient({ datasourceUrl: E2E_SUPERUSER_URL });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.$disconnect();
  }
  return withDatabase(E2E_SUPERUSER_URL, name);
}
