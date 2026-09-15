import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Bosqich 21 — `POST /auth/login`. Parol uzunlik/whitespace tekshiruvi
    ATAYLAB bu yerda YO'Q: login vaqtida "qanday parol qabul qilinishi
    mumkin edi" siyosati emas, "aynan shu satr hash bilan mos keladimi"
    tekshiriladi (`AuthService.login`, argon2id `verify`). */
export class LoginDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
