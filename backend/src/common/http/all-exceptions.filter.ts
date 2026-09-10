import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../errors/domain-error';

interface ErrorBody {
  code: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}

/**
 * YAGONA xato nuqtasi. Har qanday tashlangan narsani frontend kutayotgan
 * `{ code, message?, fieldErrors?, requestId }` + to'g'ri HTTP status'ga
 * aylantiradi (`lib/api/errors.ts` shartnomasi).
 *
 * Tartib:
 *  1. `DomainError`      → o'z kodi va statusi.
 *  2. `HttpException`    → tanasidagi `code` (bo'lsa), aks holda status→kod.
 *  3. Qolgani           → 500 `UNKNOWN` (batafsili faqat log'ga).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = req.requestId;

    const { status, body } = this.normalize(exception);
    body.requestId = requestId;

    const logPayload = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status,
      code: body.code,
    };

    if (status >= 500) {
      this.logger.error(logPayload, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(logPayload);
    }

    res.status(status).json(body);
  }

  private normalize(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof DomainError) {
      return {
        status: exception.httpStatus,
        body: {
          code: exception.code,
          message: exception.message,
          ...(exception.fieldErrors ? { fieldErrors: exception.fieldErrors } : {}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      // Nest'ning ichki HttpException'lari (masalan ServiceUnavailableException'ga
      // biz uzatgan `{ code, ... }`) — o'sha kodni saqlaymiz.
      if (raw !== null && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const code =
          typeof obj.code === 'string' ? obj.code : this.statusToCode(status);
        const message =
          typeof obj.message === 'string'
            ? obj.message
            : Array.isArray(obj.message)
              ? obj.message.join('; ')
              : exception.message;
        const fieldErrors =
          obj.fieldErrors && typeof obj.fieldErrors === 'object'
            ? (obj.fieldErrors as Record<string, string>)
            : undefined;
        return {
          status,
          body: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
        };
      }
      return {
        status,
        body: { code: this.statusToCode(status), message: exception.message },
      };
    }

    return {
      status: 500,
      body: { code: 'UNKNOWN', message: 'Ichki server xatosi' },
    };
  }

  /** HTTP status → taksonomiya kodi (server aniq kod bermagan holat). */
  private statusToCode(status: number): string {
    switch (status) {
      case 400:
      case 422:
        return 'VALIDATION';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'DUPLICATE';
      case 410:
        return 'DELETED';
      case 429:
        return 'RATE_LIMITED';
      case 503:
        return 'PAYMENTS_PAUSED';
      case 507:
        return 'STORAGE_FULL';
      default:
        return status >= 500 ? 'UNKNOWN' : 'VALIDATION';
    }
  }
}
