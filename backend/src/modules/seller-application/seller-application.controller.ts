import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AccountStatusGuard } from '@/common/guards/account-status.guard';
import { NotFoundError } from '@/common/errors/domain-error';
import { SellerApplicationService } from './seller-application.service';
import { SubmitSellerApplicationDto } from './dto/submit-seller-application.dto';
import {
  SellerApplicationResponseDto,
  toSellerApplicationResponseDto,
} from './dto/seller-application-response.dto';

/**
 * Marketplace foydalanuvchisi — sotuvchi bo'lish arizasi. `@Roles()` YO'Q
 * ATAYLAB: ariza topshirish "hali SELLER kontekstida emasman" holatida ham
 * (masalan `activeRole=null` yoki `BUYER`) ishlashi kerak — bu "SELLER
 * bo'lishga ARIZA", "SELLER sifatida ISHLASH" emas.
 */
@ApiTags('seller-application')
@Controller('me/seller-application')
export class SellerApplicationController {
  constructor(private readonly applications: SellerApplicationService) {}

  /**
   * Ariza yo'q bo'lsa 404 (`SELLER_APPLICATION_NOT_FOUND`) — bo'sh `200`
   * emas. ATAYLAB: Nest handler'dan `null` qaytarilsa `undefined` bilan
   * BIR XIL ko'rib, BO'SH TANA (literal JSON `null` EMAS) yuboradi — HTTP
   * klientlarda ikkilanish qoldiradi. 404 aniq va boshqa resurslar
   * (`SERVICE_NOT_FOUND`, `CATEGORY_NOT_FOUND`) bilan bir xil konvensiya.
   */
  @Get()
  @ApiOkResponse({ type: SellerApplicationResponseDto })
  async getCurrent(@CurrentUser() user: AccessTokenPayload): Promise<SellerApplicationResponseDto> {
    const app = await this.applications.getCurrentForUser(user.sub);
    if (!app) throw new NotFoundError('Ariza topilmagan', 'SELLER_APPLICATION_NOT_FOUND');
    return toSellerApplicationResponseDto(app);
  }

  @Post()
  @HttpCode(200)
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: SellerApplicationResponseDto })
  async submit(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SubmitSellerApplicationDto,
  ): Promise<SellerApplicationResponseDto> {
    return toSellerApplicationResponseDto(await this.applications.submit(user.sub, dto));
  }
}
