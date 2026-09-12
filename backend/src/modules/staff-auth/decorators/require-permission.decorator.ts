import { SetMetadata } from '@nestjs/common';
import type { StaffPermission } from '@prisma/client';

/**
 * `StaffPermissionGuard` shu metadata'ni o'qiydi va LIVE DB o'qish bilan
 * tekshiradi (JWT'da ruxsatlar YO'Q — admin huquqi o'zgarishi darhol
 * kuchga kirishi kerak). Bir nechta berilsa — HAMMASI talab qilinadi.
 */
export const STAFF_PERMISSION_KEY = 'staffPermission';
export const RequirePermission = (...perms: StaffPermission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(STAFF_PERMISSION_KEY, perms);
