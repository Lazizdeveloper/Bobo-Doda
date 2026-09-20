import { somToTiyin, tiyinToSom, MAX_SOM } from './money.util';
import { DomainError } from '@/common/errors/domain-error';

describe('money.util (ADR-01 — DB tiyin, DTO so‘m)', () => {
  it('somToTiyin — ×100', () => {
    expect(somToTiyin(1)).toBe(100n);
    expect(somToTiyin(500_000)).toBe(50_000_000n);
  });

  it('tiyinToSom — ÷100', () => {
    expect(tiyinToSom(100n)).toBe(1);
    expect(tiyinToSom(50_000_000n)).toBe(500_000);
  });

  it('round-trip — yo‘qotishsiz', () => {
    for (const som of [1, 100, 999, 1_234_567, MAX_SOM]) {
      expect(tiyinToSom(somToTiyin(som))).toBe(som);
    }
  });

  it.each([0, -1, -100, MAX_SOM + 1, 1.5, NaN, Infinity])(
    'yaroqsiz qiymat (%s) — DomainError(INVALID_AMOUNT)',
    (bad) => {
      expect(() => somToTiyin(bad)).toThrow(DomainError);
      try {
        somToTiyin(bad);
      } catch (err) {
        expect((err as DomainError).code).toBe('INVALID_AMOUNT');
      }
    },
  );
});
