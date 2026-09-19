import { buildPaymeCheckoutUrl } from './payme-checkout-url.util';

describe('buildPaymeCheckoutUrl', () => {
  it('rasmiy hujjatdagi misolga mos base64 chiqaradi (m/ac.order_id/a)', () => {
    // developer.help.paycom.uz misoli: m=587f72c72cac0d162c722ae2;ac.order_id=197;a=500
    // → https://checkout.paycom.uz/bT01ODdmNzJjNzJjYWMwZDE2MmM3MjJhZTI7YWMub3JkZXJfaWQ9MTk3O2E9NTAw
    const raw = 'm=587f72c72cac0d162c722ae2;ac.order_id=197;a=500';
    expect(Buffer.from(raw, 'utf8').toString('base64')).toBe(
      'bT01ODdmNzJjNzJjYWMwZDE2MmM3MjJhZTI7YWMub3JkZXJfaWQ9MTk3O2E9NTAw',
    );
  });

  it('m / ac.payment_id / a segmentlarini to‘g‘ri tartibda quradi va decode qilinganda mos', () => {
    const url = buildPaymeCheckoutUrl({
      checkoutBaseUrl: 'https://test.paycom.uz',
      merchantId: 'merchant-1',
      paymentId: '01930000-0000-7000-8000-000000000001',
      amountTiyin: 50_000_000n,
    });
    expect(url.startsWith('https://test.paycom.uz/')).toBe(true);
    const encoded = url.slice('https://test.paycom.uz/'.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decoded).toBe('m=merchant-1;ac.payment_id=01930000-0000-7000-8000-000000000001;a=50000000');
  });

  it('checkoutBaseUrl oxiridagi "/" olib tashlanadi (ikki marta "//" bo‘lmasin)', () => {
    const url = buildPaymeCheckoutUrl({
      checkoutBaseUrl: 'https://checkout.paycom.uz/',
      merchantId: 'm-1',
      paymentId: 'p-1',
      amountTiyin: 1_000n,
    });
    expect(url).toMatch(/^https:\/\/checkout\.paycom\.uz\/[A-Za-z0-9+/=]+$/);
  });

  it('lang va returnUrl — berilsa base64 ichida qo‘shiladi', () => {
    const url = buildPaymeCheckoutUrl({
      checkoutBaseUrl: 'https://checkout.paycom.uz',
      merchantId: 'm-1',
      paymentId: 'p-1',
      amountTiyin: 1_000n,
      lang: 'uz',
      returnUrl: 'https://bobododa.uz/tolov/natija',
    });
    const encoded = url.slice('https://checkout.paycom.uz/'.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decoded).toBe('m=m-1;ac.payment_id=p-1;a=1000;l=uz;c=https://bobododa.uz/tolov/natija');
  });

  it('lang/returnUrl bo‘lmasa base64 ichida yo‘q', () => {
    const url = buildPaymeCheckoutUrl({
      checkoutBaseUrl: 'https://checkout.paycom.uz',
      merchantId: 'm-1',
      paymentId: 'p-1',
      amountTiyin: 1_000n,
    });
    const decoded = Buffer.from(url.slice('https://checkout.paycom.uz/'.length), 'base64').toString('utf8');
    expect(decoded).not.toContain('l=');
    expect(decoded).not.toContain('c=');
  });
});
