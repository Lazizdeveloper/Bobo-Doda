import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Yagona xato javob shakli. Frontend `lib/api/errors.ts` `ApiErrorBody` bilan
 * bir xil: `{ code, message?, fieldErrors? }` (+ `requestId` — biz qo'shamiz).
 */
export class ApiErrorDto {
  @ApiProperty({
    example: 'VALIDATION',
    description: 'Taksonomiya kodi (`error-codes.ts`). Frontend shu bo’yicha matn tanlaydi.',
  })
  code!: string;

  @ApiPropertyOptional({
    example: 'Validatsiya muvaffaqiyatsiz',
    description: 'Log/debug uchun — foydalanuvchiga ko’rsatilmaydi.',
  })
  message?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { phone: 'Raqam band' },
    description: 'Maydon-darajali validatsiya — to’g’ridan-to’g’ri forma maydonlariga.',
  })
  fieldErrors?: Record<string, string>;

  @ApiPropertyOptional({
    example: '3f9a1c2e-...',
    description: 'So’rov identifikatori — log bilan bog’lash uchun (`x-request-id`).',
  })
  requestId?: string;
}
