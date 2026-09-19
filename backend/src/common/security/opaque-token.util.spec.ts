import { generateOpaqueToken, hashOpaqueToken } from './opaque-token.util';

describe('opaque-token.util', () => {
  it('generateOpaqueToken — har chaqiruvda noyob, yetarli uzun (256 bit → ≥40 belgi base64url)', () => {
    const tokens = new Set(Array.from({ length: 1_000 }, () => generateOpaqueToken()));
    expect(tokens.size).toBe(1_000);
    for (const t of tokens) {
      expect(t.length).toBeGreaterThanOrEqual(40);
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/); // base64url — +/= yo'q
    }
  });

  it('hashOpaqueToken — DETERMINISTIK (bir xil kirish → bir xil hash, qidiruv uchun shart)', () => {
    const raw = generateOpaqueToken();
    expect(hashOpaqueToken(raw)).toBe(hashOpaqueToken(raw));
  });

  it('hashOpaqueToken — turli kirish → turli hash, 64 xonali hex (SHA-256)', () => {
    const a = hashOpaqueToken('a');
    const b = hashOpaqueToken('b');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
