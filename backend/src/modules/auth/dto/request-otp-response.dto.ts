import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * `POST /auth/register/request-otp` VA `POST /auth/password-reset/request-otp`
 * javobi. `devOtp` — Bosqich 22, FAQAT lokal development qulayligi
 * (`OtpService.requestOtp` → `dev-otp.util.ts#shouldExposeDevOtp`): uch
 * shart BIRGA rost bo'lgandagina keladi — `NODE_ENV!==production` HAMDA
 * `SMS_PROVIDER=CONSOLE` HAMDA `DEV_EXPOSE_OTP=true`. Productionda bu
 * maydon HECH QACHON javobda bo'lmaydi.
 */
export class RequestOtpResponseDto {
  @ApiProperty({ example: true })
  sent!: true;

  @ApiPropertyOptional({
    description:
      "FAQAT DEVELOPMENT — productionda HECH QACHON qaytarilmaydi. Generatsiya qilingan OTP kodi, frontend backend konsolini o'qimasdan sinash uchun.",
    example: '532123',
  })
  devOtp?: string;
}
