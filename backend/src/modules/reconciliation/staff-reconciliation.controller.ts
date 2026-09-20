import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StaffJwtAuthGuard } from '@/modules/staff-auth/guards/staff-jwt-auth.guard';
import { StaffPermissionGuard } from '@/modules/staff-auth/guards/staff-permission.guard';
import { RequirePermission } from '@/modules/staff-auth/decorators/require-permission.decorator';
import { CurrentStaff } from '@/modules/staff-auth/decorators/current-staff.decorator';
import type { StaffAccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AuditService } from '@/common/audit/audit.service';
import type { Page } from '@/common/pagination/page-query.dto';
import { PaymentService } from '@/modules/payment/payment.service';
import { RefundService } from '@/modules/refund/refund.service';
import { PayoutService } from '@/modules/payout/payout.service';
import { ReconciliationService } from './reconciliation.service';
import { AnomalyService } from './anomaly.service';
import { ListAnomaliesQueryDto } from './dto/list-anomalies-query.dto';
import { AnomalyResponseDto, toAnomalyResponseDto } from './dto/anomaly-response.dto';
import { AcknowledgeAnomalyDto } from './dto/acknowledge-anomaly.dto';
import { ReconciliationSummaryResponseDto } from './dto/reconciliation-summary-response.dto';
import { ReconciliationRunResponseDto, toReconciliationRunResponseDto } from './dto/reconciliation-run-response.dto';

/**
 * Bo'lim 66 — mavjud `PAYMENTS` huquqi qayta ishlatiladi (yangi granular
 * permission qo'shilmadi, Payout/Dispute'da qo'llangan qoida bilan bir xil).
 *
 * Manual reconcile endpoint'lari `Idempotency-Key` TALAB QILMAYDI (bo'lim:
 * "baholab ko'rilsin, ko'r-ko'rona majburlanmasin") — chunki mutatsiyaning
 * o'zi allaqachon CAS orqali exactly-once (`applyReconciledStatus()`); ikki
 * marta bosilsa ikkinchisi shunchaki `NO_CHANGE`/`SKIPPED` qaytaradi, pul
 * ikki marta harakatlanmaydi. Staff HECH QACHON status'ni to'g'ridan-to'g'ri
 * belgilay olmaydi — faqat provider'dan SO'RASH va MAVJUD state machine'ni
 * ishga tushirishni SO'RAYDI (bo'lim 66's "hech qachon POST /staff/ledger/fix").
 */
@Public()
@ApiBearerAuth()
@ApiTags('staff-reconciliation')
@Controller('staff/reconciliation')
@UseGuards(StaffJwtAuthGuard, StaffPermissionGuard)
@RequirePermission('PAYMENTS')
export class StaffReconciliationController {
  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly anomalies: AnomalyService,
    private readonly audit: AuditService,
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
    private readonly payoutService: PayoutService,
  ) {}

  @Get('anomalies')
  async listAnomalies(@Query() query: ListAnomaliesQueryDto): Promise<Page<AnomalyResponseDto>> {
    const page = await this.anomalies.list(
      { code: query.code, severity: query.severity, entityType: query.entityType, resolved: query.resolved, since: query.since },
      query.page ?? 1,
      query.perPage ?? 20,
    );
    return { ...page, items: page.items.map(toAnomalyResponseDto) };
  }

  @Post('anomalies/:id/acknowledge')
  @HttpCode(200)
  @ApiOkResponse({ type: AnomalyResponseDto })
  async acknowledgeAnomaly(
    @CurrentStaff() staff: StaffAccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: AcknowledgeAnomalyDto,
  ): Promise<AnomalyResponseDto> {
    const actor = await this.audit.resolveStaffActor(staff.sub);
    return toAnomalyResponseDto(await this.anomalies.acknowledge(id, actor, dto.note));
  }

  @Get('summary')
  async summary(): Promise<ReconciliationSummaryResponseDto> {
    const [anomalySummary, stuck] = await Promise.all([this.anomalies.summary(), this.reconciliation.countStuck()]);
    return {
      totalAnomalies: anomalySummary.total,
      unresolvedAnomalies: anomalySummary.unresolved,
      unresolvedBySeverity: anomalySummary.bySeverity,
      stuckPayments: stuck.payments,
      stuckRefunds: stuck.refunds,
      stuckPayouts: stuck.payouts,
    };
  }

  @Post('payments/:id/reconcile')
  @HttpCode(200)
  @ApiOkResponse({ type: ReconciliationRunResponseDto })
  async reconcilePayment(@Param('id') id: string): Promise<ReconciliationRunResponseDto | { outcome: string }> {
    const payment = await this.paymentService.getByIdOrThrow(id);
    const result = await this.reconciliation.reconcilePayment(payment, 'STAFF');
    const run = await this.reconciliation.getLatestRun('PAYMENT', id);
    return run ? toReconciliationRunResponseDto(run) : { outcome: result.outcome };
  }

  @Post('refunds/:id/reconcile')
  @HttpCode(200)
  @ApiOkResponse({ type: ReconciliationRunResponseDto })
  async reconcileRefund(@Param('id') id: string): Promise<ReconciliationRunResponseDto | { outcome: string }> {
    const refund = await this.refundService.getByIdOrThrow(id);
    const result = await this.reconciliation.reconcileRefund(refund, 'STAFF');
    const run = await this.reconciliation.getLatestRun('REFUND', id);
    return run ? toReconciliationRunResponseDto(run) : { outcome: result.outcome };
  }

  @Post('payouts/:id/reconcile')
  @HttpCode(200)
  @ApiOkResponse({ type: ReconciliationRunResponseDto })
  async reconcilePayout(@Param('id') id: string): Promise<ReconciliationRunResponseDto | { outcome: string }> {
    const payout = await this.payoutService.getByIdOrThrow(id);
    const result = await this.reconciliation.reconcilePayout(payout, 'STAFF');
    const run = await this.reconciliation.getLatestRun('PAYOUT', id);
    return run ? toReconciliationRunResponseDto(run) : { outcome: result.outcome };
  }
}
