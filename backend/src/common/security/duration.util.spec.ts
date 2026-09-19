import { parseDurationMs } from './duration.util';

describe('parseDurationMs', () => {
  it.each([
    ['15m', 15 * 60_000],
    ['30d', 30 * 86_400_000],
    ['8h', 8 * 3_600_000],
    ['45s', 45 * 1_000],
    ['1d', 86_400_000],
  ])('%s → %d ms', (spec, expected) => {
    expect(parseDurationMs(spec)).toBe(expected);
  });

  it.each(['', '15', 'm', '15mm', '-5m', '15 m', '15M'])('yaroqsiz format "%s" — Error tashlaydi', (spec) => {
    expect(() => parseDurationMs(spec)).toThrow();
  });
});
