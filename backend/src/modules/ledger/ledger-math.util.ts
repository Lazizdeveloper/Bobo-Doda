import { InvariantViolationError } from '@/common/errors/domain-error';
import { computePlatformFee } from '@/common/money/fee.constant';

/** `postJournal()` chaqiruvchisi hisob rolini bildiradi — `LedgerService` shu rolni haqiqiy hisobga map qiladi. */
export type LedgerAccountRole =
  | 'PAYMENT_CLEARING'
  | 'ESCROW'
  | 'SELLER_PAYABLE'
  | 'PLATFORM_REVENUE'
  | 'REFUND_CLEARING'
  | 'PAYOUT_CLEARING'
  | 'DISPUTE_HOLD';

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

/**
 * Bosqich 8, `DISPUTE_HOLD` — bo'lim 9/11: POST-settlement Dispute
 * OCHILGANDA, DARHOL: SELLER_PAYABLE -amount ; DISPUTE_HOLD +amount.
 * `amount` — chaqiruvchi (`LedgerService.openDisputeHold`) tomonidan
 * ALLAQACHON `min(sellerNetSnapshot, joriy balans)` sifatida hisoblangan
 * (bo'lim 40/41 — negative balans hech qachon yaratilmaydi).
 */
export function computeDisputeHoldLines(amountTiyin: bigint): LedgerLine[] {
  if (amountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger dispute hold: amount musbat bo‘lishi shart', {
      amountTiyin: amountTiyin.toString(),
    });
  }
  return [
    { account: 'SELLER_PAYABLE', amount: -amountTiyin },
    { account: 'DISPUTE_HOLD', amount: amountTiyin },
  ];
}

/**
 * Bosqich 8, `DISPUTE_HOLD_RELEASE` — bo'lim 37/38: Dispute REJECTED/
 * CANCELLED (moliyaviy resolution YO'Q) — TO'LIQ un-freeze, hech qanday
 * komissiya YO'Q (resolution qo'llanmadi): DISPUTE_HOLD -amount ;
 * SELLER_PAYABLE +amount. Faqat post-settlement (hold mavjud bo'lgan)
 * disputlar uchun chaqiriladi.
 */
export function computeDisputeHoldReleaseLines(amountTiyin: bigint): LedgerLine[] {
  if (amountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger dispute hold release: amount musbat bo‘lishi shart', {
      amountTiyin: amountTiyin.toString(),
    });
  }
  return [
    { account: 'DISPUTE_HOLD', amount: -amountTiyin },
    { account: 'SELLER_PAYABLE', amount: amountTiyin },
  ];
}

/**
 * Bosqich 8, `DISPUTE_RESOLUTION` — bo'lim 23/30/31: resolve() vaqtida
 * SELLER-BOUND qismni ko'chiradi (`sellerAwardAmount > 0` bo'lganda —
 * SPLIT yoki 100% SELLER_FULL_RELEASE). Manba `debitRole` — pre-settlement
 * bo'lsa `ESCROW`, post-settlement bo'lsa `DISPUTE_HOLD` (chaqiruvchi
 * `Dispute.preSettlement`ga qarab tanlaydi). Komissiya — docs T5 misolidagi
 * FORMULA: "sotuvchi ulushiga ham standart komissiya qo'llanadi" —
 * `Contract.platformFeeRateBpsSnapshot` (AUTHORITATIVE snapshot, live
 * config emas — bo'lim 29) bo'yicha, floor yaxlitlash bilan.
 *
 * Buyer-bound qism (agar bor bo'lsa) BU YERDA UMUMAN yo'q — u DEFERRED,
 * webhook orqali tasdiqlangandan keyin `REFUND` turi bilan (bo'lim 25).
 */
export function computeDisputeResolutionLines(
  debitRole: Extract<LedgerAccountRole, 'ESCROW' | 'DISPUTE_HOLD'>,
  sellerAwardAmountTiyin: bigint,
  platformFeeRateBps: number,
): LedgerLine[] {
  if (sellerAwardAmountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger dispute resolution: sellerAwardAmount musbat bo‘lishi shart', {
      sellerAwardAmountTiyin: sellerAwardAmountTiyin.toString(),
    });
  }
  // Muhim: komissiya FAQAT `ESCROW` manbali (pre-settlement) yo'lda
  // qo'llanadi — u yerda `sellerAwardAmount` HALI YALTIROQ (fee hech qachon
  // olinmagan), docs T5 formulasi bilan bir xil ("sotuvchi ulushiga ham
  // standart komissiya qo'llanadi"). `DISPUTE_HOLD` manbali (post-settlement)
  // yo'lda `heldAmount` — asl `CONTRACT_SETTLEMENT`dan kelgan, ALLAQACHON
  // fee ayirilgan `sellerNet` snapshot'i (bo'lim 14) — shu summani qayta
  // "komissiya" bilan kamaytirish IKKI MARTA fee olish (jiddiy moliyaviy
  // xato) bo'lardi. Shuning uchun DISPUTE_HOLD manbasi uchun fee HAR DOIM 0.
  const fee = debitRole === 'ESCROW' ? computePlatformFee(sellerAwardAmountTiyin, platformFeeRateBps) : 0n;
  const net = sellerAwardAmountTiyin - fee;
  if (net <= 0n) {
    throw new InvariantViolationError('Ledger dispute resolution: sellerNet musbat bo‘lishi shart (fee >= sellerAward)', {
      sellerAwardAmountTiyin: sellerAwardAmountTiyin.toString(),
      fee: fee.toString(),
    });
  }

  const lines: LedgerLine[] = [
    { account: debitRole, amount: -sellerAwardAmountTiyin },
    { account: 'SELLER_PAYABLE', amount: net },
  ];
  if (fee > 0n) {
    lines.push({ account: 'PLATFORM_REVENUE', amount: fee });
  }
  return lines;
}

/**
 * Bosqich 8, bo'lim 25/60 — POST-settlement dispute'da buyer-bound qism
 * tashqi providerga chiqarilganda (webhook tasdiqlangach): DISPUTE_HOLD
 * -amount ; REFUND_CLEARING +amount. `computeRefundLines()`ning DISPUTE_
 * HOLD manbali versiyasi — ALOHIDA funksiya (Bosqich 7'ning allaqachon
 * sinalgan `computeRefundLines()` signature'iga TEGILMAYDI, bo'lim 26:
 * "backward compatibility saqlansin").
 */
export function computeDisputeHoldToRefundLines(amountTiyin: bigint): LedgerLine[] {
  if (amountTiyin <= 0n) {
    throw new InvariantViolationError('Ledger dispute refund (hold manbali): amount musbat bo‘lishi shart', {
      amountTiyin: amountTiyin.toString(),
    });
  }
  return [
    { account: 'DISPUTE_HOLD', amount: -amountTiyin },
    { account: 'REFUND_CLEARING', amount: amountTiyin },
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
