import type { PaymeErrorMessage } from './payme-rpc.types';

/**
 * Bosqich 12, bo'lim 6 — `PaymeMerchantService` ichida throw qilinadi,
 * `PaymeMerchantController` uni ushlab JSON-RPC `{error}` javobiga
 * aylantiradi. Global `DomainError`/`AllExceptionsFilter` bilan HECH QACHON
 * aralashmaydi — bu mutlaqo alohida, provider-specific xato tili.
 */
export class PaymeRpcError extends Error {
  readonly rpcCode: number;
  readonly rpcData?: string;

  constructor(code: number, message: string, data?: string) {
    super(message);
    this.name = 'PaymeRpcError';
    this.rpcCode = code;
    this.rpcData = data;
  }

  toMessage(): PaymeErrorMessage {
    // Bo'lim 6 — rasmiy format uch tilli. Bizda faqat bitta xabar matni
    // bor (ichki, xavfsiz) — uchtasiga ham bir xil qo'yamiz: Payme bu
    // matnni odatda ko'rsatmaydi (o'zining lokalizatsiyasidan foydalanadi),
    // lekin maydon strukturasi rasmiy spec bilan 1:1 bo'lishi shart.
    return { ru: this.message, uz: this.message, en: this.message };
  }
}
