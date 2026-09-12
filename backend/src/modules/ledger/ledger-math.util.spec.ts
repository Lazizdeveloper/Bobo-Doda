import {
  assertBalanced,
  computeFundingLines,
  computePayoutReleaseLines,
  computePayoutReservationLines,
  computeRefundLines,
  computeSettlementLines,
} from './ledger-math.util';
import { InvariantViolationError } from '@/common/errors/domain-error';

describe('computeFundingLines', () => {
  it('PAYMENT_CLEARING -amount ; ESCROW +amount — balanslangan', () => {
    const lines = computeFundingLines(90_000_00n);
    expect(lines).toEqual([
      { account: 'PAYMENT_CLEARING', amount: -90_000_00n },
      { account: 'ESCROW', amount: 90_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('0 yoki manfiy summa — InvariantViolationError', () => {
    expect(() => computeFundingLines(0n)).toThrow(InvariantViolationError);
    expect(() => computeFundingLines(-1n)).toThrow(InvariantViolationError);
  });
});

describe('computeSettlementLines', () => {
  it('oddiy fee — ESCROW -agreed ; SELLER_PAYABLE +net ; PLATFORM_REVENUE +fee, balanslangan', () => {
    const lines = computeSettlementLines(100_000_00n, 5_000_00n);
    expect(lines).toEqual([
      { account: 'ESCROW', amount: -100_000_00n },
      { account: 'SELLER_PAYABLE', amount: 95_000_00n },
      { account: 'PLATFORM_REVENUE', amount: 5_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('bo‘lim 58 — fee=0 bo‘lsa PLATFORM_REVENUE qatori yaratilmaydi (2 ta yozuv, hali balanslangan)', () => {
    const lines = computeSettlementLines(100_000_00n, 0n);
    expect(lines).toEqual([
      { account: 'ESCROW', amount: -100_000_00n },
      { account: 'SELLER_PAYABLE', amount: 100_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('agreedAmount <= 0 — InvariantViolationError', () => {
    expect(() => computeSettlementLines(0n, 0n)).toThrow(InvariantViolationError);
    expect(() => computeSettlementLines(-100n, 0n)).toThrow(InvariantViolationError);
  });

  it('platformFeeAmount manfiy — InvariantViolationError', () => {
    expect(() => computeSettlementLines(1000n, -1n)).toThrow(InvariantViolationError);
  });

  it('bo‘lim 59 — fee >= agreedAmount (sellerAmount <= 0) — InvariantViolationError', () => {
    expect(() => computeSettlementLines(1000n, 1000n)).toThrow(InvariantViolationError);
    expect(() => computeSettlementLines(1000n, 1500n)).toThrow(InvariantViolationError);
  });

  it('chetki holat — 1 tiyin agreedAmount, 0 fee — hali ham valid', () => {
    const lines = computeSettlementLines(1n, 0n);
    expect(lines).toEqual([
      { account: 'ESCROW', amount: -1n },
      { account: 'SELLER_PAYABLE', amount: 1n },
    ]);
  });
});

describe('assertBalanced', () => {
  it('sum=0 — o‘tadi', () => {
    expect(() => assertBalanced([{ account: 'ESCROW', amount: -500n }, { account: 'SELLER_PAYABLE', amount: 500n }])).not.toThrow();
  });

  it('sum != 0 — InvariantViolationError', () => {
    expect(() => assertBalanced([{ account: 'ESCROW', amount: -500n }, { account: 'SELLER_PAYABLE', amount: 400n }])).toThrow(
      InvariantViolationError,
    );
  });

  it('nolga teng yozuv — InvariantViolationError (bo‘lim 58)', () => {
    expect(() => assertBalanced([{ account: 'ESCROW', amount: 0n }])).toThrow(InvariantViolationError);
  });
});

describe('computeRefundLines (Bosqich 7)', () => {
  it('ESCROW -amount ; REFUND_CLEARING +amount — balanslangan', () => {
    const lines = computeRefundLines(50_000_00n);
    expect(lines).toEqual([
      { account: 'ESCROW', amount: -50_000_00n },
      { account: 'REFUND_CLEARING', amount: 50_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('0 yoki manfiy summa — InvariantViolationError', () => {
    expect(() => computeRefundLines(0n)).toThrow(InvariantViolationError);
    expect(() => computeRefundLines(-1n)).toThrow(InvariantViolationError);
  });
});

describe('computePayoutReservationLines (Bosqich 7)', () => {
  it('SELLER_PAYABLE -amount ; PAYOUT_CLEARING +amount — balanslangan', () => {
    const lines = computePayoutReservationLines(80_000_00n);
    expect(lines).toEqual([
      { account: 'SELLER_PAYABLE', amount: -80_000_00n },
      { account: 'PAYOUT_CLEARING', amount: 80_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('0 yoki manfiy summa — InvariantViolationError', () => {
    expect(() => computePayoutReservationLines(0n)).toThrow(InvariantViolationError);
    expect(() => computePayoutReservationLines(-1n)).toThrow(InvariantViolationError);
  });
});

describe('computePayoutReleaseLines (Bosqich 7)', () => {
  it('PAYOUT_CLEARING -amount ; SELLER_PAYABLE +amount — reservation TESKARISI, balanslangan', () => {
    const lines = computePayoutReleaseLines(80_000_00n);
    expect(lines).toEqual([
      { account: 'PAYOUT_CLEARING', amount: -80_000_00n },
      { account: 'SELLER_PAYABLE', amount: 80_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('0 yoki manfiy summa — InvariantViolationError', () => {
    expect(() => computePayoutReleaseLines(0n)).toThrow(InvariantViolationError);
    expect(() => computePayoutReleaseLines(-1n)).toThrow(InvariantViolationError);
  });
});
