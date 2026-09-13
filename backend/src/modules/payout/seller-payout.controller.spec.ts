import { SellerPayoutController } from './seller-payout.controller';
import type { PayoutService } from './payout.service';
import type { IdempotencyService } from '@/common/idempotency/idempotency.service';
import type { AuditService } from '@/common/audit/audit.service';
import type { AppConfigService } from '@/config/app-config.service';
import { DomainError } from '@/common/errors/domain-error';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';

/**
 * Bosqich 13, bo'lim 48 — bu kontrollerning YAGONA to'g'ridan-to'g'ri
 * instansiyalash orqali sinaladigan qismi: `PAYOUTS_ENABLED=false`
 * bo'lganda HECH QANDAY DB/servis chaqiruvi bo'lmasligi (mavjud hisob-
 * kitob tegilmasligi) — bu haqiqiy HTTP/DB talab qilmaydigan, tez va
 * ishonchli tekshiruv (boshqa payout testlari — `test/payout.e2e-spec.ts`,
 * real Postgres bilan).
 */
describe('SellerPayoutController — PAYOUTS_ENABLED gate', () => {
  const user = { sub: 'seller-1' } as AccessTokenPayload;

  function build(payoutsEnabled: boolean) {
    const payouts = { create: jest.fn() } as unknown as PayoutService;
    const idempotency = { run: jest.fn() } as unknown as IdempotencyService;
    const audit = { resolveUserActor: jest.fn() } as unknown as AuditService;
    const config = { payoutsEnabled } as AppConfigService;
    return { controller: new SellerPayoutController(payouts, idempotency, audit, config), payouts, idempotency };
  }

  it('PAYOUTS_ENABLED=false — FEATURE_DISABLED, payouts.create/idempotency.run HECH QACHON chaqirilmaydi', async () => {
    const { controller, payouts, idempotency } = build(false);
    await expect(controller.create(user, { amount: 1000, destinationReference: 'Uzcard •••• 1234' }, 'idem-1')).rejects.toMatchObject({
      code: 'FEATURE_DISABLED',
    } satisfies Partial<DomainError>);
    expect(payouts.create).not.toHaveBeenCalled();
    expect(idempotency.run).not.toHaveBeenCalled();
  });

  it('PAYOUTS_ENABLED=true — Idempotency-Key tekshiruviga o‘tadi (gate to‘smaydi)', async () => {
    const { controller } = build(true);
    await expect(controller.create(user, { amount: 1000, destinationReference: 'Uzcard •••• 1234' }, undefined)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    } satisfies Partial<DomainError>);
  });
});
