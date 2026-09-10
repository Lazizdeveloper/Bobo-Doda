import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Tiplashtirilgan konfiguratsiya. Kod hech qayerda `process.env` ni
 * to'g'ridan-to'g'ri o'qimaydi — faqat shu servis orqali (validatsiyadan
 * o'tgan, tiplangan qiymatlar).
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get port(): number {
    return this.get('PORT');
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  get swaggerEnabled(): boolean {
    return this.get('SWAGGER_ENABLED');
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  /** `bobododa_migrator` roli — faqat `prisma migrate` CLI ishlatadi. */
  get databaseMigrationUrl(): string {
    return this.get('DATABASE_MIGRATION_URL');
  }

  get redisUrl(): string {
    return this.get('REDIS_URL');
  }

  get s3(): {
    endpoint: string | undefined;
    region: string;
    accessKey: string | undefined;
    secretKey: string | undefined;
    bucketUploads: string;
    bucketKyc: string;
  } {
    return {
      endpoint: this.get('S3_ENDPOINT'),
      region: this.get('S3_REGION'),
      accessKey: this.get('S3_ACCESS_KEY'),
      secretKey: this.get('S3_SECRET_KEY'),
      bucketUploads: this.get('S3_BUCKET_UPLOADS'),
      bucketKyc: this.get('S3_BUCKET_KYC'),
    };
  }

  get jwt(): {
    accessSecret: string | undefined;
    refreshSecret: string | undefined;
    accessTtl: string;
    refreshTtl: string;
  } {
    return {
      accessSecret: this.get('JWT_ACCESS_SECRET'),
      refreshSecret: this.get('JWT_REFRESH_SECRET'),
      accessTtl: this.get('JWT_ACCESS_TTL'),
      refreshTtl: this.get('JWT_REFRESH_TTL'),
    };
  }
}
