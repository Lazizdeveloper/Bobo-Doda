import { InvariantViolationError } from '@/common/errors/domain-error';

/** `postJournal()` chaqiruvchisi hisob rolini bildiradi — `LedgerService` shu rolni haqiqiy hisobga map qiladi. */
export type LedgerAccountRole =
  | 'PAYMENT_CLEARING'
  | 'ESCROW'
  | 'SELLER_PAYABLE'
  | 'PLATFORM_REVENUE'
  | 'REFUND_CLEARING'
  | 'PAYOUT_CLEARING';

export interface LedgerLine {
  account: LedgerAccountRole;
  /** Ishorali tiyin (docs B8) — musbat = kredit, manfiy = debit. */
  amount: bigint;
}

/**
 * Pure funksiya — DB'siz unit test qilinadi. Real HTTP chaqiruvi/tarmoq
 * I/O yo'q, faqat arifmetika + invariant tekshiruvi.
 */

/** `PAYMENT_FUNDING` — bo'lim 10: PAYMENT_CLEARING -amount ; ESCROW(buyer) +amount. */
export function computeFundingLines(amountTiyin: bigint): LedgerLine[] {
  if (amountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger funding: amount musbat bo‘lishi shart', { amountTiyin: amountTiyin.toString() });
  }
  return [
    { account: 'PAYMENT_CLEARING', amount: -amountTiyin },
    { account: 'ESCROW', amount: amountTiyin },
  ];
}

/**
 * `CONTRACT_SETTLEMENT` — bo'lim 11: ESCROW -agreedAmount ; SELLER_PAYABLE
 * +net ; PLATFORM_REVENUE +fee. Fee snapshot AUTHORITATIVE (bo'lim 12) —
 * bu yerda hech qanday runtime fee config o'qilmaydi.
 *
 * Bo'lim 58 — nolinchi yozuv yaratilmaydi: fee=0 bo'lsa PLATFORM_REVENUE
 * qatori butunlay tashlab ketiladi (journal 2 ta yozuv bilan ham
 * balanslangan qoladi).
 */
export function computeSettlementLines(agreedAmountTiyin: bigint, platformFeeAmountTiyin: bigint): LedgerLine[] {
  if (agreedAmountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger settlement: agreedAmount musbat bo‘lishi shart', {
      agreedAmountTiyin: agreedAmountTiyin.toString(),
    });
  }
  if (platformFeeAmountTiyin < 0n) {
    throw new InvariantViolationError('Ledger settlement: platformFeeAmount manfiy bo‘lishi mumkin emas', {
      platformFeeAmountTiyin: platformFeeAmountTiyin.toString(),
    });
  }
  const sellerAmount = agreedAmountTiyin - platformFeeAmountTiyin;
  if (sellerAmount <= 0n) {
    // Bo'lim 59 — "fee >= agreedAmount bo'lishi mumkin emas". Phase 4
    // validatsiyasi buni amalda oldini oladi, lekin ledger o'z-o'zicha
    // himoyalangan bo'lishi shart (defensive invariant, boshqa qatlamga
    // ishonmaydi).
    throw new InvariantViolationError('Ledger settlement: sellerAmount musbat bo‘lishi shart (fee >= agreedAmount)', {
      agreedAmountTiyin: agreedAmountTiyin.toString(),
      platformFeeAmountTiyin: platformFeeAmountTiyin.toString(),
    });
  }

  const lines: LedgerLine[] = [
    { account: 'ESCROW', amount: -agreedAmountTiyin },
    { account: 'SELLER_PAYABLE', amount: sellerAmount },
  ];
  if (platformFeeAmountTiyin > 0n) {
    lines.push({ account: 'PLATFORM_REVENUE', amount: platformFeeAmountTiyin });
  }
  return lines;
}

/**
 * Bosqich 7, `REFUND` — bo'lim 10: ESCROW -amount ; REFUND_CLEARING +amount.
 * FAQAT pre-settlement (chaqiruvchi — `LedgerService.refundPayment()` —
 * Contract hali ACTIVE ekanini alohida tekshiradi).
 */
export function computeRefundLines(amountTiyin: bigint): LedgerLine[] {
  if (amountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger refund: amount musbat bo‘lishi shart', { amountTiyin: amountTiyin.toString() });
  }
  return [
    { account: 'ESCROW', amount: -amountTiyin },
    { account: 'REFUND_CLEARING', amount: amountTiyin },
  ];
}

/**
 * Bosqich 7, `PAYOUT_RESERVATION` — bo'lim 23: SELLER_PAYABLE -amount ;
 * PAYOUT_CLEARING(seller) +amount. Chaqiruvchi (`PayoutService`) bu
 * chaqiruvdan OLDIN allaqachon `FOR UPDATE` qulf ostida yetarlilikni
 * tekshirgan bo'ladi (bo'lim 22/26) — bu funksiya faqat arifmetika.
 */
export function computePayoutReservationLines(amountTiyin: bigint): LedgerLine[] {
  if (amountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger payout reservation: amount musbat bo‘lishi shart', {
      amountTiyin: amountTiyin.toString(),
    });
  }
  return [
    { account: 'SELLER_PAYABLE', amount: -amountTiyin },
    { account: 'PAYOUT_CLEARING', amount: amountTiyin },
  ];
}

/**
 * Bosqich 7, `PAYOUT_RELEASE` — bo'lim 31/32: FAILED payout uchun
 * rezervatsiyani BEKOR qiladi (original yozuvni EMAS — birinchi haqiqiy
 * reversal naqshi): PAYOUT_CLEARING -amount ; SELLER_PAYABLE +amount.
 */
export function computePayoutReleaseLines(amountTiyin: bigint): LedgerLine[] {
  if (amountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger payout release: amount musbat bo‘lishi shart', {
      amountTiyin: amountTiyin.toString(),
    });
  }
  return [
    { account: 'PAYOUT_CLEARING', amount: -amountTiyin },
    { account: 'SELLER_PAYABLE', amount: amountTiyin },
  ];
}

/** Bo'lim 2 — mutlaq invariant: `SUM(amount) === 0`. Nol-summa yozuv ham taqiqlangan (bo'lim 58). */
export function assertBalanced(lines: LedgerLine[]): void {
  if (lines.some((l) => l.amount === 0n)) {
    throw new InvariantViolationError('Ledger journal: nolga teng summali yozuv yaratib bo‘lmaydi');
  }
  const sum = lines.reduce((acc, l) => acc + l.amount, 0n);
  if (sum !== 0n) {
    throw new InvariantViolationError(`Ledger journal balanslanmagan: sum=${sum.toString()}`, {
      lines: lines.map((l) => ({ account: l.account, amount: l.amount.toString() })),
    });
  }
}
