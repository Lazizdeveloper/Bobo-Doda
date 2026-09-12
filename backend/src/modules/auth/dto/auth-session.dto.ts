import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * `/auth/otp/verify`, `/auth/refresh`, `/me/roles/choose`, `/me/roles/switch`
 * javobi. Refresh token BU YERDA YO'Q — u httpOnly cookie'da (JSON tanasiga
 * chiqarilmaydi, XSS orqali o'g'irlanmasin).
 */
export class AuthSessionDto {
  @ApiProperty({ description: 'Qisqa umrli JWT — `Authorization: Bearer <token>`' })
  accessToken!: string;

  @ApiPropertyOptional({ enum: Role, nullable: true, description: 'NULL — rol hali tanlanmagan' })
  activeRole!: Role | null;

  @ApiProperty()
  roleChosen!: boolean;

  @ApiProperty()
  profileDone!: boolean;

  @ApiProperty()
  isNewUser!: boolean;
}
