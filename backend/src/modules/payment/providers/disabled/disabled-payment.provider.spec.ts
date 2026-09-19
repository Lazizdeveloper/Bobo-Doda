import { DisabledPaymentProvider } from './disabled-payment.provider';
import type { PaymentProvider } from '../payment-provider.interface';
import { DomainError } from '@/common/errors/domain-error';

describe('DisabledPaymentProvider', () => {
  const provider = new DisabledPaymentProvider();

  it('name — "DISABLED" (TEST/real provider nomi bilan aralashmaydi)', () => {
    expect(provider.name).toBe('DISABLED');
  });

  it('createPayment — FEATURE_DISABLED bilan rad etadi (o‘lik yo‘l, hech qachon chaqirilmasligi kerak)', async () => {
    await expect(
      provider.createPayment({ paymentId: 'p-1', contractId: 'c-1', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'FEATURE_DISABLED' } satisfies Partial<DomainError>);
  });

  it('refundPayment — FEATURE_DISABLED bilan rad etadi', async () => {
    await expect(
      provider.refundPayment({ refundId: 'r-1', paymentId: 'p-1', providerPaymentId: 'pp-1', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'FEATURE_DISABLED' } satisfies Partial<DomainError>);
  });

  it('verifyWebhook — FEATURE_DISABLED bilan tashlaydi (o‘lik yo‘l)', () => {
    expect(() => provider.verifyWebhook({ rawBody: Buffer.from(''), headers: {} })).toThrow(DomainError);
  });

  it('buildCheckoutUrl/queryPayment/queryRefund/cancelPayment — implement qilinmagan (capability-based, uydirma emas)', () => {
    const asInterface: PaymentProvider = provider;
    expect(asInterface.buildCheckoutUrl).toBeUndefined();
    expect(asInterface.queryPayment).toBeUndefined();
    expect(asInterface.queryRefund).toBeUndefined();
    expect(asInterface.cancelPayment).toBeUndefined();
  });
});
