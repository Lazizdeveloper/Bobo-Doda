import { TestPaymentProvider, TEST_PROVIDER_SIGNATURE_HEADER } from './test-payment.provider';
import { DomainError } from '@/common/errors/domain-error';

const SECRET = 'unit-test-secret-not-real-1234';

function buildBody(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(
    JSON.stringify({
      eventId: 'evt_1',
      providerPaymentId: 'test_pay_1',
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amount: 90_000_00,
      currency: 'UZS',
      ...overrides,
    }),
  );
}

describe('TestPaymentProvider.createPayment', () => {
  it('OK ssenariysi (sukut) — providerPaymentId qaytaradi', async () => {
    const provider = new TestPaymentProvider(SECRET);
    const result = await provider.createPayment({
      paymentId: 'p1',
      contractId: 'c1',
      amountTiyin: 100n,
      currency: 'UZS',
    });
    expect(result.providerPaymentId).toBe('test_p1');
  });

  it('REJECT ssenariysi — PAYMENT_PROVIDER_ERROR (deterministik)', async () => {
    const provider = new TestPaymentProvider(SECRET);
    provider.queueScenario('c1', 'REJECT');
    await expect(
      provider.createPayment({ paymentId: 'p1', contractId: 'c1', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });
  });

  it('TIMEOUT ssenariysi — PAYMENT_PROVIDER_UNAVAILABLE (ambiguous)', async () => {
    const provider = new TestPaymentProvider(SECRET);
    provider.queueScenario('c1', 'TIMEOUT');
    await expect(
      provider.createPayment({ paymentId: 'p1', contractId: 'c1', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_UNAVAILABLE' });
  });

  it('scenario BIR MARTA ishlatiladi — keyingi chaqiruv OK ga qaytadi', async () => {
    const provider = new TestPaymentProvider(SECRET);
    provider.queueScenario('c1', 'REJECT');
    await expect(
      provider.createPayment({ paymentId: 'p1', contractId: 'c1', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toThrow(DomainError);
    await expect(
      provider.createPayment({ paymentId: 'p2', contractId: 'c1', amountTiyin: 100n, currency: 'UZS' }),
    ).resolves.toMatchObject({ providerPaymentId: 'test_p2' });
  });
});

describe('TestPaymentProvider.refundPayment (Bosqich 7)', () => {
  it('OK ssenariysi (sukut) — providerRefundId qaytaradi', async () => {
    const provider = new TestPaymentProvider(SECRET);
    const result = await provider.refundPayment({
      refundId: 'r1',
      paymentId: 'p1',
      providerPaymentId: 'test_p1',
      amountTiyin: 100n,
      currency: 'UZS',
    });
    expect(result.providerRefundId).toBe('test_refund_r1');
  });

  it('REJECT ssenariysi — PAYMENT_PROVIDER_ERROR (deterministik)', async () => {
    const provider = new TestPaymentProvider(SECRET);
    // `paymentId` bo‘yicha navbatga qo‘yiladi (bo‘lim 45) — bu ID chaqiruvdan
    // OLDIN ma’lum (refund yaratilishidan oldin Payment allaqachon mavjud).
    provider.queueScenario('p1', 'REJECT');
    await expect(
      provider.refundPayment({ refundId: 'r1', paymentId: 'p1', providerPaymentId: 'test_p1', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });
  });

  it('TIMEOUT ssenariysi — PAYMENT_PROVIDER_UNAVAILABLE (ambiguous)', async () => {
    const provider = new TestPaymentProvider(SECRET);
    provider.queueScenario('p1', 'TIMEOUT');
    await expect(
      provider.refundPayment({ refundId: 'r1', paymentId: 'p1', providerPaymentId: 'test_p1', amountTiyin: 100n, currency: 'UZS' }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_UNAVAILABLE' });
  });

  it('scenario BIR MARTA ishlatiladi — keyingi chaqiruv OK ga qaytadi', async () => {
    const provider = new TestPaymentProvider(SECRET);
    provider.queueScenario('p1', 'REJECT');
    await expect(
      provider.refundPayment({ refundId: 'r1', paymentId: 'p1', providerPaymentId: 'x', amountTiyin: 1n, currency: 'UZS' }),
    ).rejects.toThrow(DomainError);
    await expect(
      provider.refundPayment({ refundId: 'r2', paymentId: 'p1', providerPaymentId: 'x', amountTiyin: 1n, currency: 'UZS' }),
    ).resolves.toMatchObject({ providerRefundId: 'test_refund_r2' });
  });
});

describe('TestPaymentProvider.verifyWebhook — REFUND kind (Bosqich 7)', () => {
  const provider = new TestPaymentProvider(SECRET);

  function buildRefundBody(overrides: Record<string, unknown> = {}): Buffer {
    return Buffer.from(
      JSON.stringify({
        kind: 'REFUND',
        eventId: 'revt_1',
        providerRefundId: 'test_refund_r1',
        eventType: 'refund.succeeded',
        status: 'SUCCEEDED',
        amount: 50_000_00,
        currency: 'UZS',
        ...overrides,
      }),
    );
  }

  it('to‘g‘ri imzo — REFUND hodisasi `kind` diskriminatori bilan qaytadi', () => {
    const rawBody = buildRefundBody();
    const signature = provider.signPayload(rawBody);
    const event = provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } });
    expect(event).toEqual({
      kind: 'REFUND',
      providerEventId: 'revt_1',
      providerRefundId: 'test_refund_r1',
      eventType: 'refund.succeeded',
      status: 'SUCCEEDED',
      amountTiyin: 5_000_000n,
      currency: 'UZS',
    });
  });

  it('`kind` berilmasa sukut PAYMENT hisoblanadi (orqaga moslik)', () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        eventId: 'evt_2',
        providerPaymentId: 'test_pay_2',
        eventType: 'payment.succeeded',
        status: 'SUCCEEDED',
        amount: 1000,
        currency: 'UZS',
      }),
    );
    const signature = provider.signPayload(rawBody);
    const event = provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } });
    expect(event.kind).toBe('PAYMENT');
  });

  it('noma’lum `kind` — PAYMENT_WEBHOOK_INVALID', () => {
    const rawBody = buildRefundBody({ kind: 'SOMETHING_ELSE' });
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
  });

  it('REFUND — status "CANCELLED" ruxsat etilmagan (faqat SUCCEEDED/FAILED)', () => {
    const rawBody = buildRefundBody({ status: 'CANCELLED' });
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
  });

  it.each(['eventId', 'providerRefundId', 'eventType', 'amount', 'currency', 'status'])(
    "REFUND — majburiy maydon '%s' yo‘q — PAYMENT_WEBHOOK_INVALID",
    (field) => {
      const body = JSON.parse(buildRefundBody().toString('utf8')) as Record<string, unknown>;
      delete body[field];
      const rawBody = Buffer.from(JSON.stringify(body));
      const signature = provider.signPayload(rawBody);
      expect(() =>
        provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } }),
      ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
    },
  );
});

describe('TestPaymentProvider.verifyWebhook', () => {
  const provider = new TestPaymentProvider(SECRET);

  it('to‘g‘ri imzo — parslangan hodisani qaytaradi', () => {
    const rawBody = buildBody();
    const signature = provider.signPayload(rawBody);
    const event = provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } });
    expect(event).toEqual({
      kind: 'PAYMENT',
      providerEventId: 'evt_1',
      providerPaymentId: 'test_pay_1',
      eventType: 'payment.succeeded',
      status: 'SUCCEEDED',
      amountTiyin: 9_000_000n,
      currency: 'UZS',
    });
  });

  it('imzo header yo‘q — PAYMENT_WEBHOOK_INVALID', () => {
    const rawBody = buildBody();
    expect(() => provider.verifyWebhook({ rawBody, headers: {} })).toThrow(
      expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }),
    );
  });

  it('imzo mos emas — PAYMENT_WEBHOOK_INVALID', () => {
    const rawBody = buildBody();
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: 'aa'.repeat(32) } }),
    ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
  });

  it('boshqa sir bilan imzolangan (yasama provider) — PAYMENT_WEBHOOK_INVALID', () => {
    const otherProvider = new TestPaymentProvider('boshqa-sir-boshqa-sir-boshqa');
    const rawBody = buildBody();
    const forgedSignature = otherProvider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: forgedSignature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
  });

  it('yaroqsiz JSON — PAYMENT_WEBHOOK_INVALID', () => {
    const rawBody = Buffer.from('not-json{{{');
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
  });

  it.each(['eventId', 'providerPaymentId', 'eventType', 'amount', 'currency', 'status'])(
    "majburiy maydon '%s' yo‘q — PAYMENT_WEBHOOK_INVALID",
    (field) => {
      const body = buildBody();
      const parsed = JSON.parse(body.toString('utf8')) as Record<string, unknown>;
      delete parsed[field];
      const rawBody = Buffer.from(JSON.stringify(parsed));
      const signature = provider.signPayload(rawBody);
      expect(() =>
        provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } }),
      ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
    },
  );

  it('noto‘g‘ri status qiymati — PAYMENT_WEBHOOK_INVALID', () => {
    const rawBody = buildBody({ status: 'PENDING' });
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
  });

  it('amount butun son bo‘lmasa — PAYMENT_WEBHOOK_INVALID (minor unit — float emas)', () => {
    const rawBody = buildBody({ amount: 12.34 });
    const signature = provider.signPayload(rawBody);
    expect(() =>
      provider.verifyWebhook({ rawBody, headers: { [TEST_PROVIDER_SIGNATURE_HEADER]: signature } }),
    ).toThrow(expect.objectContaining({ code: 'PAYMENT_WEBHOOK_INVALID' }));
  });
});
