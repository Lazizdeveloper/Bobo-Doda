import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** `POST /me/roles/choose` — FAQAT birinchi marta (`!user.roleChosen`). */
export class ChooseRoleDto {
  @ApiProperty({ enum: Role, example: Role.BUYER })
  @IsEnum(Role)
  role!: Role;
}
