import {
  assertDeadlineValid,
  assertMilestoneCountWithinLimit,
  assertMilestonesSumMatches,
  assertNotSelfPurchase,
} from './contract-validation.util';
import { DomainError } from '@/common/errors/domain-error';
import { MAX_MILESTONES } from './contract.constants';

describe('contract-validation.util', () => {
  describe('assertMilestoneCountWithinLimit', () => {
    it.each([1, MAX_MILESTONES])('%i ta — o‘tadi', (count) => {
      expect(() => assertMilestoneCountWithinLimit(count)).not.toThrow();
    });

    it(`${MAX_MILESTONES + 1} ta — TOO_MANY_MILESTONES`, () => {
      expect(() => assertMilestoneCountWithinLimit(MAX_MILESTONES + 1)).toThrow(DomainError);
      try {
        assertMilestoneCountWithinLimit(MAX_MILESTONES + 1);
      } catch (err) {
        expect((err as DomainError).code).toBe('TOO_MANY_MILESTONES');
      }
    });
  });

  describe('assertDeadlineValid', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    it('kelajakdagi sana — o‘tadi', () => {
      expect(() => assertDeadlineValid(new Date('2026-06-01T00:00:00.000Z'), now)).not.toThrow();
    });

    it.each([
      ['o‘tmishdagi sana', new Date('2025-01-01T00:00:00.000Z')],
      ['aynan hozir', now],
      ['yaroqsiz sana', new Date('not-a-date')],
    ])('%s — DEADLINE_INVALID', (_label, deadline) => {
      expect(() => assertDeadlineValid(deadline, now)).toThrow(DomainError);
      try {
        assertDeadlineValid(deadline, now);
      } catch (err) {
        expect((err as DomainError).code).toBe('DEADLINE_INVALID');
      }
    });
  });

  describe('assertNotSelfPurchase', () => {
    it('turli userId — o‘tadi', () => {
      expect(() => assertNotSelfPurchase('buyer-1', 'seller-1')).not.toThrow();
    });

    it('bir xil userId — CONTRACT_SELF_PURCHASE_NOT_ALLOWED', () => {
      expect(() => assertNotSelfPurchase('user-1', 'user-1')).toThrow(DomainError);
      try {
        assertNotSelfPurchase('user-1', 'user-1');
      } catch (err) {
        expect((err as DomainError).code).toBe('CONTRACT_SELF_PURCHASE_NOT_ALLOWED');
      }
    });
  });

  describe('assertMilestonesSumMatches', () => {
    it('yig‘indi mos — o‘tadi', () => {
      expect(() =>
        assertMilestonesSumMatches([{ amount: 400_000 }, { amount: 500_000 }], 90_000_000n),
      ).not.toThrow();
    });

    it('yig‘indi ko‘p — MILESTONE_AMOUNT_MISMATCH', () => {
      expect(() => assertMilestonesSumMatches([{ amount: 400_000 }], 90_000_000n)).toThrow(DomainError);
    });

    it('yig‘indi kam — MILESTONE_AMOUNT_MISMATCH', () => {
      try {
        assertMilestonesSumMatches([{ amount: 1 }], 90_000_000n);
        fail('should have thrown');
      } catch (err) {
        expect((err as DomainError).code).toBe('MILESTONE_AMOUNT_MISMATCH');
      }
    });

    it('bitta milestone, aniq mos — o‘tadi', () => {
      expect(() => assertMilestonesSumMatches([{ amount: 900_000 }], 90_000_000n)).not.toThrow();
    });
  });
});
