import { SetMetadata } from '@nestjs/common';
import type { StaffPermission, StaffRole } from '@prisma/client';

/**
 * `StaffPermissionGuard` shu metadata'ni o'qiydi va LIVE DB o'qish bilan
 * tekshiradi (JWT'da ruxsatlar YO'Q — admin huquqi o'zgarishi darhol
 * kuchga kirishi kerak). Bir nechta berilsa — HAMMASI talab qilinadi.
 */
export const STAFF_PERMISSION_KEY = 'staffPermission';
export const RequirePermission = (...perms: StaffPermission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(STAFF_PERMISSION_KEY, perms);

/**
 * Bosqich 11, bo'lim 18 — ADR-05'dagi "SETTINGS + SUPER_ADMIN" naqshi bilan
 * bir xil: ba'zi amallar (staff yaratish, ruxsatlarni o'zgartirish) oddiy
 * granular permissiondan KO'RA yuqori ishonch talab qiladi. `role` HAM JWT
 * claim'ida bor, lekin bu yerda ATAYLAB `StaffPermissionGuard` LIVE DB
 * o'qishi bilan BIR YO'LA tekshiriladi (rol pasaytirilsa darhol kuchga
 * kirsin — JWT muddati tugashini kutmasdan).
 */
export const STAFF_ROLE_KEY = 'staffRole';
export const RequireRole = (...roles: StaffRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(STAFF_ROLE_KEY, roles);
