import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { FinancialIntegrityService, type FinancialIntegrityScanResult } from './financial-integrity.service';

/**
 * Bo'lim 48/51 — `/health/ready`dan ATAYLAB ALOHIDA: bu yerdagi scan
 * (`LedgerIntegrityService`ning barcha `$queryRaw` tekshiruvlari) OG'IR,
 * health-check'ga qo'yilmaydi. Faqat staff, talab bo'yicha (yoki CLI —
 * `npm run financial:check`) chaqiradi. `POST` — chunki natija YANGI
 * `FinancialAnomaly` qatorlar yozishi mumkin (yon ta'sirli, `GET` emas).
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-financial-integrity')
@Controller('staff/financial-integrity')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('PAYMENTS')
export class StaffFinancialIntegrityController {
  constructor(private readonly integrity: FinancialIntegrityService) {}

  @Post('scan')
  @HttpCode(200)
  async scan(): Promise<FinancialIntegrityScanResult> {
    return this.integrity.scan();
  }
}
