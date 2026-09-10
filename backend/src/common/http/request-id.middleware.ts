import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

/**
 * Har so'rovga `requestId` biriktiradi (kiruvchi `x-request-id` ni hurmat
 * qiladi, bo'lmasa yangi UUID). Javob header'iga ham yozadi. Pino logger va
 * `AllExceptionsFilter` shu qiymatni ishlatadi.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id =
      (Array.isArray(incoming) ? incoming[0] : incoming)?.trim() || randomUUID();
    req.requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
