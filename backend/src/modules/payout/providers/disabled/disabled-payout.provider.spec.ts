import { DisabledPayoutProvider } from './disabled-payout.provider';
import type { PayoutProvider } from '../payout-provider.interface';
import { DomainError } from '@/common/errors/domain-error';

describe('DisabledPayoutProvider', () => {
  const provider = new DisabledPayoutProvider();

  it('name — "DISABLED" (TEST/real provider nomi bilan aralashmaydi)', () => {
    expect(provider.name).toBe('DISABLED');
  });

  it('createPayout — FEATURE_DISABLED bilan rad etadi', async () => {
    await expect(
      provider.createPayout({ payoutId: 'p-1', sellerId: 's-1', destinationReference: 'ref', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'FEATURE_DISABLED' } satisfies Partial<DomainError>);
  });

  it('verifyWebhook — FEATURE_DISABLED bilan tashlaydi (o‘lik yo‘l, hech qachon chaqirilmasligi kerak)', () => {
    expect(() => provider.verifyWebhook({ rawBody: Buffer.from(''), headers: {} })).toThrow(DomainError);
  });

  it('queryPayout — implement qilinmagan (reconciliation gracefully o‘tkazib yuboradi)', () => {
    const asInterface: PayoutProvider = provider;
    expect(asInterface.queryPayout).toBeUndefined();
  });
});
