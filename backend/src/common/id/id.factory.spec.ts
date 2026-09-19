import { IdFactory, newId } from './id.factory';

const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('id.factory (UUIDv7)', () => {
  it('10 000 ta ketma-ket ID leksikografik jihatdan QAT’IY o’sadi', () => {
    const n = 10_000;
    const ids: string[] = [];
    for (let i = 0; i < n; i++) ids.push(newId());

    let violations = 0;
    let prev = ids[0] as string;
    for (let i = 1; i < ids.length; i++) {
      const cur = ids[i] as string;
      if (!(cur > prev)) violations++;
      prev = cur;
    }
    expect(violations).toBe(0);

    // Xolisona tekshiruv: nusxaning string-sort'i asl tartib bilan bir xil.
    expect([...ids].sort()).toEqual(ids);
    // ...va noyob (qat'iy o'sish → takror yo'q).
    expect(new Set(ids).size).toBe(n);
  });

  it('barcha ID UUIDv7 formatida (versiya nibble = 7, variant = 8–b)', () => {
    for (let i = 0; i < 1_000; i++) {
      expect(newId()).toMatch(UUID_V7_RE);
    }
  });

  it('noyob — 50 000 ta ID, takror yo’q', () => {
    const set = new Set<string>();
    for (let i = 0; i < 50_000; i++) set.add(newId());
    expect(set.size).toBe(50_000);
  });

  it('vaqt tartibli — kutishdan keyin yaratilgan ID kattaroq', async () => {
    const a = newId();
    await new Promise((r) => setTimeout(r, 5));
    const b = newId();
    expect(a < b).toBe(true);
    // v7 timestamp prefiksi (birinchi 12 hex / 48 bit) o'smoqda yoki teng.
    const prefix = (id: string): string => id.replace(/-/g, '').slice(0, 12);
    expect(prefix(a) <= prefix(b)).toBe(true);
  });

  it('IdFactory.next() newId() bilan bir xil manba', () => {
    expect(new IdFactory().next()).toMatch(UUID_V7_RE);
  });
});
