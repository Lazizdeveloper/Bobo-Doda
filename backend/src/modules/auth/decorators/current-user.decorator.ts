import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../types/token-payload';

/** `JwtAuthGuard` tomonidan `req.user`ga yozilgan payload. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest<Request & { user: AccessTokenPayload }>();
    return req.user;
  },
);
