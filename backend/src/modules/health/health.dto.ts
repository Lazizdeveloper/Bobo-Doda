import { ApiProperty } from '@nestjs/swagger';

export class LivenessDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 42 })
  uptimeSeconds!: number;

  /** Bo'lim 24 — deploy izlanuvchanligi: qaysi commit ishlayotganini
      tashqaridan (secret'siz) tekshirish uchun. Deploy vaqtida `GIT_COMMIT_SHA`
      berilmasa `undefined` (masalan lokal `next dev`/`nest start:dev`). */
  @ApiProperty({ example: '67e1191', required: false })
  commit?: string;
}

export class ReadinessDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: true })
  db!: boolean;

  @ApiProperty({ example: true })
  redis!: boolean;
}
