import { derivePlayMobileMessageId } from './playmobile-message-id.util';

describe('derivePlayMobileMessageId', () => {
  it('reference berilsa — 20 hex belgi, deterministik (bir xil reference → bir xil natija)', () => {
    const a = derivePlayMobileMessageId('01930000-0000-7000-8000-000000000001');
    const b = derivePlayMobileMessageId('01930000-0000-7000-8000-000000000001');
    expect(a).toBe(b);
    expect(a).toHaveLength(20);
    expect(a).toMatch(/^[0-9a-f]{20}$/);
  });

  it('boshqa reference — boshqa natija', () => {
    const a = derivePlayMobileMessageId('ref-1');
    const b = derivePlayMobileMessageId('ref-2');
    expect(a).not.toBe(b);
  });

  it('reference yo‘q — 20 hex belgi, har chaqiruvda TASODIFIY', () => {
    const a = derivePlayMobileMessageId();
    const b = derivePlayMobileMessageId();
    expect(a).toHaveLength(20);
    expect(a).toMatch(/^[0-9a-f]{20}$/);
    expect(a).not.toBe(b);
  });
});
