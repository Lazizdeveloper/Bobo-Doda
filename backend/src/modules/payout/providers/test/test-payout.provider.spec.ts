import { TestPayoutProvider, TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER } from './test-payout.provider';
import { DomainError } from '@/common/errors/domain-error';

const SECRET = 'unit-test-payout-secret-not-real-1234';

function buildBody(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(
    JSON.stringify({
      eventId: 'pevt_1',
      providerPayoutId: 'test_payout_p1',
      eventType: 'payout.succeeded',
      status: 'SUCCEEDED',
      amount: 80_000_00,
      currency: 'UZS',
      ...overrides,
    }),
  );
}

describe('TestPayoutProvider.createPayout', () => {
  it('OK ssenariysi (sukut) — providerPayoutId qaytaradi', async () => {
    const provider = new TestPayoutProvider(SECRET);
    const result = await provider.createPayout({
      payoutId: 'p1',
      sellerId: 's1',
      destinationReference: 'Uzcard •••• 1234',
      amountTiyin: 100n,
      currency: 'UZS',
    });
    expect(result.providerPayoutId).toBe('test_payout_p1');
  });

  it('REJECT ssenariysi — PAYOUT_PROVIDER_ERROR (deterministik)', async () => {
    const provider = new TestPayoutProvider(SECRET);
    // `sellerId` bo‘yicha navbatga qo‘yiladi (bo‘lim 45) — bu ID
    // chaqiruvdan OLDIN ma’lum (`payoutId` server ichida generatsiya bo‘ladi).
    provider.queueScenario('s1', 'REJECT');
    await expect(
      provider.createPayout({ payoutId: 'p1', sellerId: 's1', destinationReference: 'x', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'PAYOUT_PROVIDER_ERROR' });
  });

  it('TIMEOUT ssenariysi — PAYOUT_PROVIDER_UNAVAILABLE (ambiguous)', async () => {
    const provider = new TestPayoutProvider(SECRET);
    provider.queueScenario('s1', 'TIMEOUT');
    await expect(
      provider.createPayout({ payoutId: 'p1', sellerId: 's1', destinationReference: 'x', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'PAYOUT_PROVIDER_UNAVAILABLE' });
  });

  it('scenario BIR MARTA ishlatiladi — keyingi chaqiruv OK ga qaytadi', async () => {
    const provider = new TestPayoutProvider(SECRET);
    provider.queueScenario('s1', 'REJECT');
    await expect(
      provider.createPayout({ payoutId: 'p1', sellerId: 's1', destinationReference: 'x', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toThrow(DomainError);
    await expect(
      provider.createPayout({ payoutId: 'p2', sellerId: 's1', destinationReference: 'x', amountTiyin: 100n, currency: 'UZS' }),
    ).resolves.toMatchObject({ providerPayoutId: 'test_payout_p2' });
  });
});

describe('TestPayoutProvider.verifyWebhook', () => {
  const provider = new TestPayoutProvider(SECRET);

  it('to‘g‘ri imzo — parslangan hodisani qaytaradi', () => {
    const rawBody = buildBody();
    const signature = provider.signPayload(rawBody);
    const event = provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: signature } });
    expect(event).toEqual({
      providerEventId: 'pevt_1',
      providerPayoutId: 'test_payout_p1',
      eventType: 'payout.succeeded',
      status: 'SUCCEEDED',
      amountTiyin: 8_000_000n,
      currency: 'UZS',
    });
  });

  it('imzo header yo‘q — PAYOUT_WEBHOOK_INVALID', () => {
    const rawBody = buildBody();
    expect(() => provider.verifyWebhook({ rawBody, headers: {} })).toThrow(
      expect.objectContaining({ code: 'PAYOUT_WEBHOOK_INVALID' }),
    );
  });

  it('imzo mos emas — PAYOUT_WEBHOOK_INVALID', () => {
    const rawBody = buildBody();
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: 'aa'.repeat(32) } }),
    ).toThrow(expect.objectContaining({ code: 'PAYOUT_WEBHOOK_INVALID' }));
  });

  it('boshqa sir bilan imzolangan (yasama provider) — PAYOUT_WEBHOOK_INVALID', () => {
    const otherProvider = new TestPayoutProvider('boshqa-sir-boshqa-sir-boshqa');
    const rawBody = buildBody();
    const forgedSignature = otherProvider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: forgedSignature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYOUT_WEBHOOK_INVALID' }));
  });

  it('Payment provider bilan BIR XIL sir bo‘lsa ham — imzo formati mustaqil (kross-provider forgery sinovi)', () => {
    // Payout — Payment’dan ALOHIDA sir/HMAC instansiyasi (bo‘lim 28); bu
    // yerda faqat shuni tekshiramiz — bir xil sirdan yasalgan boshqa
    // `TestPayoutProvider` instansiyasi baribir TO‘G‘RI signature beradi
    // (chunki sir bir xil) — signature sxemaning o‘ziga xosligini emas,
    // sir ISOLYATSIYASINI amalda `payout.module.ts`/`payment.module.ts`
    // ALOHIDA `PAYOUT_TEST_WEBHOOK_SECRET`/`PAYMENT_TEST_WEBHOOK_SECRET`
    // orqali ta’minlaydi (config darajasida, bu yerda emas).
    const sameSecretProvider = new TestPayoutProvider(SECRET);
    const rawBody = buildBody();
    const signature = sameSecretProvider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).not.toThrow();
  });

  it('yaroqsiz JSON — PAYOUT_WEBHOOK_INVALID', () => {
    const rawBody = Buffer.from('not-json{{{');
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYOUT_WEBHOOK_INVALID' }));
  });

  it.each(['eventId', 'providerPayoutId', 'eventType', 'amount', 'currency', 'status'])(
    "majburiy maydon '%s' yo‘q — PAYOUT_WEBHOOK_INVALID",
    (field) => {
      const body = JSON.parse(buildBody().toString('utf8')) as Record<string, unknown>;
      delete body[field];
      const rawBody = Buffer.from(JSON.stringify(body));
      const signature = provider.signPayload(rawBody);
      expect(() =>
        provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: signature } }),
      ).toThrow(expect.objectContaining({ code: 'PAYOUT_WEBHOOK_INVALID' }));
    },
  );

  it('noto‘g‘ri status qiymati — PAYOUT_WEBHOOK_INVALID', () => {
    const rawBody = buildBody({ status: 'PENDING' });
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYOUT_WEBHOOK_INVALID' }));
  });

  it('amount butun son bo‘lmasa — PAYOUT_WEBHOOK_INVALID (minor unit — float emas)', () => {
    const rawBody = buildBody({ amount: 12.34 });
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PAYOUT_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYOUT_WEBHOOK_INVALID' }));
  });
});
