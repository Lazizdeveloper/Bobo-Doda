import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

/**
 * `RolesGuard` shu metadata'ni o'qiydi. Ownership tekshiruvi BU YERDA YO'Q —
 * har domen servisi o'z query-scoping'ini qiladi (masalan
 * `where: { id, sellerId: user.sub }`) — rol faqat "qaysi kabinet",
 * ob'ekt egaligi emas (talab: "authorization faqat role bilan tugamasin").
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
