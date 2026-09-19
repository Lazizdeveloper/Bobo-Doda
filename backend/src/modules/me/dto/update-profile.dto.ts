import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Bosqich 3 — profil tahriri. `avatarKey` ATAYLAB YO'Q: fayl yuklash
 * infratuzilmasi (S3 presigned) hali yo'q (Bosqich 5) — mijoz erkin
 * `avatarKey` yubora olishi xavfsizlik teshigi bo'lardi (o'zboshimcha
 * obyekt kalitiga ishora). Telefon ham YO'Q — identity maydoni, alohida
 * xavfsiz oqim talab qiladi (spec: hozir yo'q).
 */
export class UpdateProfileDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  // Trim VALIDATSIYADAN OLDIN — aks holda "  a  " (bo'sh joylar bilan 5
  // belgi) MinLength(2)'dan o'tib, keyin 1 belgili ismga aylanardi.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
}
