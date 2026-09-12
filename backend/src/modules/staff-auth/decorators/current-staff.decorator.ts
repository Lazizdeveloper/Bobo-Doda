import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';

export const CurrentStaff = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): StaffAccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest<Request & { staff: StaffAccessTokenPayload }>();
    return req.staff;
  },
);
