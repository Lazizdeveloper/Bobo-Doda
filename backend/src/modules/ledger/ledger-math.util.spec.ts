import {
  assertBalanced,
  computeDisputeHoldLines,
  computeDisputeHoldReleaseLines,
  computeDisputeHoldToRefundLines,
  computeDisputeResolutionLines,
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

describe('computeDisputeHoldLines (Bosqich 8)', () => {
  it('SELLER_PAYABLE -amount ; DISPUTE_HOLD +amount — balanslangan', () => {
    const lines = computeDisputeHoldLines(60_000_00n);
    expect(lines).toEqual([
      { account: 'SELLER_PAYABLE', amount: -60_000_00n },
      { account: 'DISPUTE_HOLD', amount: 60_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('0 yoki manfiy summa — InvariantViolationError', () => {
    expect(() => computeDisputeHoldLines(0n)).toThrow(InvariantViolationError);
    expect(() => computeDisputeHoldLines(-1n)).toThrow(InvariantViolationError);
  });
});

describe('computeDisputeHoldReleaseLines (Bosqich 8)', () => {
  it('DISPUTE_HOLD -amount ; SELLER_PAYABLE +amount — hold TESKARISI, balanslangan', () => {
    const lines = computeDisputeHoldReleaseLines(60_000_00n);
    expect(lines).toEqual([
      { account: 'DISPUTE_HOLD', amount: -60_000_00n },
      { account: 'SELLER_PAYABLE', amount: 60_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('0 yoki manfiy summa — InvariantViolationError', () => {
    expect(() => computeDisputeHoldReleaseLines(0n)).toThrow(InvariantViolationError);
    expect(() => computeDisputeHoldReleaseLines(-1n)).toThrow(InvariantViolationError);
  });
});

describe('computeDisputeHoldToRefundLines (Bosqich 8)', () => {
  it('DISPUTE_HOLD -amount ; REFUND_CLEARING +amount — balanslangan', () => {
    const lines = computeDisputeHoldToRefundLines(40_000_00n);
    expect(lines).toEqual([
      { account: 'DISPUTE_HOLD', amount: -40_000_00n },
      { account: 'REFUND_CLEARING', amount: 40_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('0 yoki manfiy summa — InvariantViolationError', () => {
    expect(() => computeDisputeHoldToRefundLines(0n)).toThrow(InvariantViolationError);
    expect(() => computeDisputeHoldToRefundLines(-1n)).toThrow(InvariantViolationError);
  });
});

describe('computeDisputeResolutionLines (Bosqich 8)', () => {
  it('ESCROW manbasi — oddiy fee, balanslangan (docs T5 formulasi: sotuvchi ulushiga ham komissiya)', () => {
    const lines = computeDisputeResolutionLines('ESCROW', 40_000_00n, 500);
    expect(lines).toEqual([
      { account: 'ESCROW', amount: -40_000_00n },
      { account: 'SELLER_PAYABLE', amount: 38_000_00n },
      { account: 'PLATFORM_REVENUE', amount: 2_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('DISPUTE_HOLD manbasi — post-settlement, KOMISSIYA YO‘Q (heldAmount allaqachon sellerNet, ikki marta fee olinmaydi)', () => {
    const lines = computeDisputeResolutionLines('DISPUTE_HOLD', 40_000_00n, 500);
    expect(lines).toEqual([
      { account: 'DISPUTE_HOLD', amount: -40_000_00n },
      { account: 'SELLER_PAYABLE', amount: 40_000_00n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('bo‘lim 58 uslubi — fee=0 bo‘lsa PLATFORM_REVENUE qatori yaratilmaydi (2 ta yozuv, hali balanslangan)', () => {
    const lines = computeDisputeResolutionLines('ESCROW', 1000n, 0);
    expect(lines).toEqual([
      { account: 'ESCROW', amount: -1000n },
      { account: 'SELLER_PAYABLE', amount: 1000n },
    ]);
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  it('sellerAwardAmount <= 0 — InvariantViolationError', () => {
    expect(() => computeDisputeResolutionLines('ESCROW', 0n, 500)).toThrow(InvariantViolationError);
    expect(() => computeDisputeResolutionLines('ESCROW', -1n, 500)).toThrow(InvariantViolationError);
  });

  it('fee >= sellerAward (sellerNet <= 0) — InvariantViolationError', () => {
    expect(() => computeDisputeResolutionLines('ESCROW', 100n, 10_000)).toThrow(InvariantViolationError);
  });
});
