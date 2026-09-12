import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@/config/config.module';
import { AppConfigService } from '@/config/app-config.service';
import { REQUEST_ID_HEADER } from '@/common/http/request-id.middleware';

/**
 * Strukturaviy JSON log (Pino). `requestId` har yozuvga biriktiriladi
 * (`RequestIdMiddleware` dan). Access-log `autoLogging: false` — yagona
 * so'rov yozuvini `LoggingInterceptor` beradi (ikki marta yozilmasin).
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          autoLogging: false,
          quietReqLogger: true,
          genReqId: (req, res) => {
            const existing = (req.headers[REQUEST_ID_HEADER] ?? '') as string;
            const id = existing || (req as { id?: string }).id || randomUUID();
            res.setHeader(REQUEST_ID_HEADER, id);
            return id;
          },
          customProps: (req) => ({ requestId: (req as { id?: string }).id }),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.newPassword',
              'req.body.currentPassword',
              // Bosqich 2 — OTP kodi va tokenlar HECH QACHON logga tushmasin.
              'req.body.code',
              'req.body.refreshToken',
              'res.headers["set-cookie"]',
            ],
            remove: true,
          },
          transport:
            config.isProduction || config.isTest
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l' },
                },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
