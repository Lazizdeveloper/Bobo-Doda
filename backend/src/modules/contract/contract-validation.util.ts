import { DomainError } from '@/common/errors/domain-error';
import { somToTiyin } from '@/common/money/money.util';
import { MAX_MILESTONES } from './contract.constants';

/** Sof funksiyalar — DB/servisdan mustaqil, unit test bilan to'g'ridan-to'g'ri tekshiriladi. */

export function assertMilestoneCountWithinLimit(count: number): void {
  if (count > MAX_MILESTONES) {
    throw new DomainError('TOO_MANY_MILESTONES', `Ko'pi bilan ${MAX_MILESTONES} ta bosqich`);
  }
}

export function assertDeadlineValid(deadline: Date, now: Date = new Date()): void {
  if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= now.getTime()) {
    throw new DomainError('DEADLINE_INVALID', "Muddat kelajakda bo'lishi shart");
  }
}

export function assertNotSelfPurchase(buyerId: string, sellerId: string): void {
  if (buyerId === sellerId) {
    throw new DomainError('CONTRACT_SELF_PURCHASE_NOT_ALLOWED', "O'z xizmatingizni sotib ololmaysiz");
  }
}

/** `milestones[].amount` (so'm) yig'indisi `agreedAmountTiyin`ga (BigInt tiyin) TENG bo'lishi shart. */
export function assertMilestonesSumMatches(
  milestonesSom: Array<{ amount: number }>,
  agreedAmountTiyin: bigint,
): void {
  const sumSom = milestonesSom.reduce((sum, m) => sum + m.amount, 0);
  if (somToTiyin(sumSom) !== agreedAmountTiyin) {
    throw new DomainError(
      'MILESTONE_AMOUNT_MISMATCH',
      "Bosqichlar yig'indisi xizmat narxiga teng bo'lishi shart",
    );
  }
}
