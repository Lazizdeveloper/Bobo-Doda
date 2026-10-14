import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { AuditService } from '@/common/audit/audit.service';
import { PaymentService } from '@/modules/payment/payment.service';
import { PaymeMerchantService } from './payme-merchant.service';
import { PAYME_REASON, PAYME_STATE, resolvePaymeReason } from './payme-rpc.types';
import { PaymeRpcError } from './payme-rpc-error';

describe('PaymeMerchantService (Unit)', () => {
  let service: PaymeMerchantService;
  let prisma: {
    payment: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    paymeTransaction: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let ids: { next: jest.Mock };
  let audit: { record: jest.Mock };
  let payments: {
    attachProviderReference: jest.Mock;
    applyProviderRpcStatus: jest.Mock;
  };

  const paymentId = '01a1399d-8f9c-71cc-8080-000000000001';
  const paymeTxId = '6acf49070db40b28a3b84373';
  const mockPayment = {
    id: paymentId,
    amount: 50000000n, // 500,000 UZS in tiyin
    currency: 'UZS',
    status: 'PENDING',
    contractId: '01a1399d-8f9c-71cc-8080-000000000000',
    buyerId: '01a1399d-8f9c-71cc-8080-000000000002',
    providerPaymentId: null,
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      paymeTransaction: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    ids = { next: jest.fn().mockReturnValue('tx-uuid-1') };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    payments = {
      attachProviderReference: jest.fn().mockResolvedValue(undefined),
      applyProviderRpcStatus: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymeMerchantService,
        { provide: PrismaService, useValue: prisma },
        { provide: IdFactory, useValue: ids },
        { provide: AuditService, useValue: audit },
        { provide: PaymentService, useValue: payments },
      ],
    }).compile();

    service = module.get<PaymeMerchantService>(PaymeMerchantService);
  });

  describe('resolvePaymeReason', () => {
    it('returns null for CREATED (1)', () => {
      expect(resolvePaymeReason(PAYME_STATE.CREATED, null)).toBeNull();
      expect(resolvePaymeReason(PAYME_STATE.CREATED, undefined)).toBeNull();
    });

    it('returns null for PERFORMED (2)', () => {
      expect(resolvePaymeReason(PAYME_STATE.PERFORMED, null)).toBeNull();
      expect(resolvePaymeReason(PAYME_STATE.PERFORMED, undefined)).toBeNull();
    });

    it('returns 3 (or cancelReason) for CANCELLED_BEFORE_PERFORM (-1)', () => {
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_BEFORE_PERFORM, null)).toBe(
        PAYME_REASON.CANCELLED_BEFORE_PERFORM,
      );
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_BEFORE_PERFORM, undefined)).toBe(
        PAYME_REASON.CANCELLED_BEFORE_PERFORM,
      );
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_BEFORE_PERFORM, 3)).toBe(3);
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_BEFORE_PERFORM, 1)).toBe(1);
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_BEFORE_PERFORM, 0)).toBe(3);
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_BEFORE_PERFORM, -1)).toBe(3);
    });

    it('returns 5 for CANCELLED_AFTER_PERFORM (-2) regardless of DB column value', () => {
      // Even if legacy row had cancelReason: 1 (as in the screenshot), reason must be 5
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_AFTER_PERFORM, 1)).toBe(5);
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_AFTER_PERFORM, null)).toBe(5);
      expect(resolvePaymeReason(PAYME_STATE.CANCELLED_AFTER_PERFORM, 5)).toBe(5);
    });
  });

  describe('CreateTransaction', () => {
    it('creates a new transaction with state 1 and returns state 1, create_time, transaction', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      prisma.paymeTransaction.findUnique.mockResolvedValue(null);
      const now = new Date();
      const mockCreated = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        amount: 50000000n,
        state: PAYME_STATE.CREATED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: null,
        cancelTime: null,
      };
      prisma.paymeTransaction.create.mockResolvedValue(mockCreated);

      const res = await service.createTransaction({
        id: paymeTxId,
        time: now.getTime(),
        amount: 50000000,
        account: { payment_id: paymentId },
      });

      expect(res.state).toBe(1);
      expect(res.transaction).toBe(paymentId);
      expect(typeof res.create_time).toBe('number');
      expect(payments.attachProviderReference).toHaveBeenCalledWith(
        paymentId,
        paymeTxId,
        mockCreated.createTime,
      );
    });

    it('returns existing transaction idempotently for replay with same id/account/amount', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      const now = new Date();
      const existing = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        amount: 50000000n,
        state: PAYME_STATE.CREATED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: null,
        cancelTime: null,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(existing);

      const res = await service.createTransaction({
        id: paymeTxId,
        time: now.getTime(),
        amount: 50000000,
        account: { payment_id: paymentId },
      });

      expect(res.state).toBe(1);
      expect(res.transaction).toBe(paymentId);
      expect(prisma.paymeTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('PerformTransaction', () => {
    it('transitions state 1 -> 2, sets performTime, calls applyProviderRpcStatus SUCCEEDED', async () => {
      const now = new Date();
      const existing = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        amount: 50000000n,
        state: PAYME_STATE.CREATED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: null,
        cancelTime: null,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(existing);
      prisma.paymeTransaction.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findUniqueOrThrow.mockResolvedValue({ ...mockPayment, status: 'PROCESSING' });
      prisma.paymeTransaction.findUniqueOrThrow.mockResolvedValue({
        ...existing,
        state: PAYME_STATE.PERFORMED,
        performTime: now,
      });

      const res = await service.performTransaction({ id: paymeTxId });

      expect(res.state).toBe(2);
      expect(res.transaction).toBe(paymentId);
      expect(typeof res.perform_time).toBe('number');
      expect(payments.applyProviderRpcStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'SUCCEEDED',
      );
    });

    it('returns existing result idempotently if already PERFORMED', async () => {
      const now = new Date();
      const existing = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        amount: 50000000n,
        state: PAYME_STATE.PERFORMED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: now,
        cancelTime: null,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(existing);

      const res = await service.performTransaction({ id: paymeTxId });

      expect(res.state).toBe(2);
      expect(prisma.paymeTransaction.updateMany).not.toHaveBeenCalled();
      expect(payments.applyProviderRpcStatus).not.toHaveBeenCalled();
    });

    it('throws OPERATION_NOT_ALLOWED if transaction is already cancelled', async () => {
      const existing = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        state: PAYME_STATE.CANCELLED_BEFORE_PERFORM,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(existing);

      await expect(service.performTransaction({ id: paymeTxId })).rejects.toThrow(PaymeRpcError);
    });
  });

  describe('CancelTransaction', () => {
    it('cancels an unperformed transaction (state 1 -> -1), sets cancelReason: 3 by default', async () => {
      const now = new Date();
      const existing = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        amount: 50000000n,
        state: PAYME_STATE.CREATED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: null,
        cancelTime: null,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(existing);
      prisma.paymeTransaction.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findUniqueOrThrow.mockResolvedValue({ ...mockPayment, status: 'PROCESSING' });
      prisma.paymeTransaction.findUniqueOrThrow.mockResolvedValue({
        ...existing,
        state: PAYME_STATE.CANCELLED_BEFORE_PERFORM,
        cancelTime: now,
        cancelReason: 3,
      });

      const res = await service.cancelTransaction({ id: paymeTxId });

      expect(res.state).toBe(-1);
      expect(res.transaction).toBe(paymentId);
      expect(typeof res.cancel_time).toBe('number');
      expect(prisma.paymeTransaction.updateMany).toHaveBeenCalledWith({
        where: { paymeTransactionId: paymeTxId, state: PAYME_STATE.CREATED },
        data: expect.objectContaining({
          state: PAYME_STATE.CANCELLED_BEFORE_PERFORM,
          cancelReason: 3,
        }),
      });
      expect(payments.applyProviderRpcStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'CANCELLED',
      );
    });

    it('cancels an unperformed transaction with passed reason (e.g. 3)', async () => {
      const now = new Date();
      const existing = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        state: PAYME_STATE.CREATED,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(existing);
      prisma.paymeTransaction.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findUniqueOrThrow.mockResolvedValue({ ...mockPayment, status: 'PROCESSING' });
      prisma.paymeTransaction.findUniqueOrThrow.mockResolvedValue({
        ...existing,
        state: PAYME_STATE.CANCELLED_BEFORE_PERFORM,
        cancelTime: now,
        cancelReason: 3,
      });

      const res = await service.cancelTransaction({ id: paymeTxId, reason: 3 });

      expect(res.state).toBe(-1);
      expect(prisma.paymeTransaction.updateMany).toHaveBeenCalledWith({
        where: { paymeTransactionId: paymeTxId, state: PAYME_STATE.CREATED },
        data: expect.objectContaining({
          state: PAYME_STATE.CANCELLED_BEFORE_PERFORM,
          cancelReason: 3,
        }),
      });
    });

    it('cancels an already PERFORMED transaction (state 2 -> -2) and saves cancelReason: 5 even if params.reason is 1', async () => {
      const now = new Date();
      const existing = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        amount: 50000000n,
        state: PAYME_STATE.PERFORMED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: now,
        cancelTime: null,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(existing);
      prisma.paymeTransaction.update.mockResolvedValue({
        ...existing,
        state: PAYME_STATE.CANCELLED_AFTER_PERFORM,
        cancelTime: now,
        cancelReason: 5,
      });

      // Passing reason: 1 as seen in the Paycom sandbox screenshot
      const res = await service.cancelTransaction({ id: paymeTxId, reason: 1 });

      expect(res.state).toBe(-2);
      expect(res.transaction).toBe(paymentId);
      expect(typeof res.cancel_time).toBe('number');
      // Crucial: DB update must have cancelReason: 5
      expect(prisma.paymeTransaction.update).toHaveBeenCalledWith({
        where: { paymeTransactionId: paymeTxId },
        data: expect.objectContaining({
          state: PAYME_STATE.CANCELLED_AFTER_PERFORM,
          cancelReason: 5,
        }),
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYME_CANCEL_AFTER_PERFORM',
          resourceId: paymentId,
        }),
      );
    });

    it('is idempotent for already cancelled transactions', async () => {
      const now = new Date();
      const cancelled = {
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        state: PAYME_STATE.CANCELLED_AFTER_PERFORM,
        cancelReason: 5,
        cancelTime: now,
      };
      prisma.paymeTransaction.findUnique.mockResolvedValue(cancelled);

      const res = await service.cancelTransaction({ id: paymeTxId, reason: 5 });

      expect(res.state).toBe(-2);
      expect(prisma.paymeTransaction.update).not.toHaveBeenCalled();
      expect(prisma.paymeTransaction.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('CheckTransaction', () => {
    it('returns state: 1, reason: null for CREATED transaction', async () => {
      const now = new Date();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        state: PAYME_STATE.CREATED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: null,
        cancelTime: null,
      });

      const res = await service.checkTransaction({ id: paymeTxId });

      expect(res.state).toBe(1);
      expect(res.reason).toBeNull();
      expect(res.perform_time).toBe(0);
      expect(res.cancel_time).toBe(0);
      expect(res.transaction).toBe(paymentId);
    });

    it('returns state: 2, reason: null for PERFORMED transaction', async () => {
      const now = new Date();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        state: PAYME_STATE.PERFORMED,
        cancelReason: null,
        providerTime: now,
        createTime: now,
        performTime: now,
        cancelTime: null,
      });

      const res = await service.checkTransaction({ id: paymeTxId });

      expect(res.state).toBe(2);
      expect(res.reason).toBeNull();
      expect(typeof res.perform_time).toBe('number');
      expect(res.perform_time).toBeGreaterThan(0);
      expect(res.cancel_time).toBe(0);
    });

    it('returns state: -1, reason: 3 for CANCELLED_BEFORE_PERFORM transaction', async () => {
      const now = new Date();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        state: PAYME_STATE.CANCELLED_BEFORE_PERFORM,
        cancelReason: 3,
        providerTime: now,
        createTime: now,
        performTime: null,
        cancelTime: now,
      });

      const res = await service.checkTransaction({ id: paymeTxId });

      expect(res.state).toBe(-1);
      expect(res.reason).toBe(3);
      expect(res.perform_time).toBe(0);
      expect(typeof res.cancel_time).toBe('number');
      expect(res.cancel_time).toBeGreaterThan(0);
    });

    it('returns state: -2, reason: 5 for CANCELLED_AFTER_PERFORM transaction even if DB has cancelReason: 1', async () => {
      const now = new Date();
      // Legacy DB row with cancelReason: 1 from previous tests
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'tx-uuid-1',
        paymeTransactionId: paymeTxId,
        paymentId,
        state: PAYME_STATE.CANCELLED_AFTER_PERFORM,
        cancelReason: 1, // legacy value in DB!
        providerTime: now,
        createTime: now,
        performTime: now,
        cancelTime: now,
      });

      const res = await service.checkTransaction({ id: paymeTxId });

      expect(res.state).toBe(-2);
      expect(res.reason).toBe(5);
      expect(typeof res.perform_time).toBe('number');
      expect(typeof res.cancel_time).toBe('number');
    });

    it('throws TRANSACTION_NOT_FOUND if id does not exist', async () => {
      prisma.paymeTransaction.findUnique.mockResolvedValue(null);

      await expect(service.checkTransaction({ id: 'nonexistent' })).rejects.toThrow(PaymeRpcError);
    });
  });

  describe('GetStatement', () => {
    it('returns transactions array matching the screenshot requirements and state/reason matrix', async () => {
      const t1 = new Date('2026-10-14T10:00:00Z');
      const t2 = new Date('2026-10-14T10:30:00Z');
      const t3 = new Date('2026-10-14T11:00:00Z');
      const t4 = new Date('2026-10-14T11:30:00Z');

      prisma.paymeTransaction.findMany.mockResolvedValue([
        // 1. Created -> Perform -> Cancel (state: -2, reason: 5, even if DB has 1)
        {
          id: 'row-1',
          paymeTransactionId: '6acf49070db40b28a3b84373',
          paymentId: '01a1399d-8f9c-71cc-8080-000000000001',
          amount: 50000000n,
          state: PAYME_STATE.CANCELLED_AFTER_PERFORM,
          cancelReason: 1, // legacy row in screenshot had 1!
          providerTime: t1,
          createTime: t1,
          performTime: t2,
          cancelTime: t3,
        },
        // 2. Created -> Cancel (state: -1, reason: 3)
        {
          id: 'row-2',
          paymeTransactionId: '6acf54d48d04b828a3b843a6',
          paymentId: '01a139e1-8079-729f-a500-000000000002',
          amount: 25000000n,
          state: PAYME_STATE.CANCELLED_BEFORE_PERFORM,
          cancelReason: 3,
          providerTime: t2,
          createTime: t2,
          performTime: null,
          cancelTime: t3,
        },
        // 3. Created -> Perform (state: 2, reason: null)
        {
          id: 'row-3',
          paymeTransactionId: '6acf55000000000000000003',
          paymentId: '01a139e1-8079-729f-a500-000000000003',
          amount: 10000000n,
          state: PAYME_STATE.PERFORMED,
          cancelReason: null,
          providerTime: t3,
          createTime: t3,
          performTime: t4,
          cancelTime: null,
        },
        // 4. Created only (state: 1, reason: null)
        {
          id: 'row-4',
          paymeTransactionId: '6acf56000000000000000004',
          paymentId: '01a139e1-8079-729f-a500-000000000004',
          amount: 15000000n,
          state: PAYME_STATE.CREATED,
          cancelReason: null,
          providerTime: t4,
          createTime: t4,
          performTime: null,
          cancelTime: null,
        },
      ]);

      const res = await service.getStatement({
        from: t1.getTime() - 1000,
        to: t4.getTime() + 1000,
      });

      const txs = res.transactions as Array<Record<string, unknown>>;
      expect(txs).toHaveLength(4);
      const [tx0, tx1, tx2, tx3] = txs;

      // Row 1: Cancelled after perform -> state: -2, reason: 5!
      expect(tx0?.state).toBe(-2);
      expect(tx0?.reason).toBe(5);
      expect(tx0?.amount).toBe(50000000);

      // Row 2: Cancelled before perform -> state: -1, reason: 3!
      expect(tx1?.state).toBe(-1);
      expect(tx1?.reason).toBe(3);
      expect(tx1?.amount).toBe(25000000);

      // Row 3: Performed -> state: 2, reason: null!
      expect(tx2?.state).toBe(2);
      expect(tx2?.reason).toBeNull();

      // Row 4: Created -> state: 1, reason: null!
      expect(tx3?.state).toBe(1);
      expect(tx3?.reason).toBeNull();
    });

    it('throws INVALID_REQUEST when from > to', async () => {
      await expect(
        service.getStatement({
          from: 2000,
          to: 1000,
        }),
      ).rejects.toThrow(PaymeRpcError);
    });
  });
});
