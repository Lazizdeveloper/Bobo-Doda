import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

/**
 * Har HTTP so'rov uchun bitta strukturaviy "handled" yozuvi (method, url,
 * status, davomiylik, requestId). Xatolarni `AllExceptionsFilter` alohida
 * loglaydi, shuning uchun bu yerda faqat MUVAFFAQIYATLI oqim loglanadi
 * (ikki marta yozilmasin).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
          this.logger.log({
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
          });
        },
        // error → filter loglaydi
      }),
    );
  }
}
