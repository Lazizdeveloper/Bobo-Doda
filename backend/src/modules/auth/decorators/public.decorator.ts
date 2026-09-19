import { SetMetadata } from '@nestjs/common';

/** Global `JwtAuthGuard`ni shu route/controller uchun chetlab o'tadi. */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
