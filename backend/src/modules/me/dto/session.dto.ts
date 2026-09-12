import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/** `RefreshToken` — `tokenHash` HECH QACHON chiqmaydi. */
export class SessionDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ enum: Role, nullable: true }) activeRole!: Role | null;
  @ApiPropertyOptional({ nullable: true }) userAgent!: string | null;
  @ApiPropertyOptional({ nullable: true }) ip!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty({ description: 'Shu so‘rovni yuborgan tokenning o‘zi shu sessiyagami' })
  current!: boolean;
}
