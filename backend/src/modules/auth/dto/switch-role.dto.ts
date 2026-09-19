import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** `POST /me/roles/switch` — foydalanuvchi ALLAQACHON ega bo'lgan rolga o'tish. */
export class SwitchRoleDto {
  @ApiProperty({ enum: Role, example: Role.SELLER })
  @IsEnum(Role)
  role!: Role;
}
