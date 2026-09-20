import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** `tokenHash` HECH QACHON qaytarilmaydi — bo'lim 49. */
export class StaffSessionListItemDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() userAgent?: string | null;
  @ApiPropertyOptional() ip?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() expiresAt!: Date;
}
