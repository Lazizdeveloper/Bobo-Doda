import { dateToPaymeTimestampMs, parsePaymeTimestampMs } from './payme-time.util';
import { PaymeRpcError } from './payme-rpc-error';

describe('payme-time.util', () => {
  it('valid ms epoch — Date qaytaradi', () => {
    const d = parsePaymeTimestampMs(1399114284039, 'time');
    expect(d.getTime()).toBe(1399114284039);
  });

  it('round-trip — parsePaymeTimestampMs ↔ dateToPaymeTimestampMs', () => {
    const ms = 1_758_000_000_000;
    expect(dateToPaymeTimestampMs(parsePaymeTimestampMs(ms, 'time'))).toBe(ms);
  });

  it('number emas — PaymeRpcError (-32600)', () => {
    expect(() => parsePaymeTimestampMs('1399114284039', 'time')).toThrow(PaymeRpcError);
    try {
      parsePaymeTimestampMs('bad', 'time');
    } catch (err) {
      expect((err as PaymeRpcError).rpcCode).toBe(-32600);
    }
  });

  it('NaN/Infinity — rad etiladi', () => {
    expect(() => parsePaymeTimestampMs(NaN, 'time')).toThrow(PaymeRpcError);
    expect(() => parsePaymeTimestampMs(Infinity, 'time')).toThrow(PaymeRpcError);
  });

  it('0 yoki manfiy — rad etiladi', () => {
    expect(() => parsePaymeTimestampMs(0, 'time')).toThrow(PaymeRpcError);
    expect(() => parsePaymeTimestampMs(-1, 'time')).toThrow(PaymeRpcError);
  });

  it('decimal (butun son emas) — rad etiladi', () => {
    expect(() => parsePaymeTimestampMs(123.45, 'time')).toThrow(PaymeRpcError);
  });

  it('haddan tashqari katta (overflow) — rad etiladi', () => {
    expect(() => parsePaymeTimestampMs(8_000_000_000_000_000, 'time')).toThrow(PaymeRpcError);
  });
});
