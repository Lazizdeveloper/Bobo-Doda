import { ApiProperty } from '@nestjs/swagger';

export class LivenessDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 42 })
  uptimeSeconds!: number;
}

export class ReadinessDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: true })
  db!: boolean;

  @ApiProperty({ example: true })
  redis!: boolean;
}
