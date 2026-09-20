import { Body, Controller, Headers, HttpCode, Inject, Logger, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { PaymeMerchantService } from './payme-merchant.service';
import { PaymeRpcError } from './payme-rpc-error';
import {
  PAYME_ERROR,
  PAYME_MERCHANT_CONFIG,
  type PaymeMerchantConfig,
  type PaymeRpcErrorResponse,
  type PaymeRpcSuccessResponse,
} from './payme-rpc.types';
import { verifyPaymeBasicAuth } from './payme-basic-auth.util';

type PaymeMethodHandler = (params: Record<string, unknown>) => Promise<Record<string, unknown>>;

/**
 * Bosqich 12, bo'lim 3/6/7 — Payme'ni generic `POST /payments/webhooks/:provider`
 * ga zo'rlab tiqmaydi: bitta DEDICATED JSON-RPC endpoint (rasmiy protokol:
 * `POST /pay/` — bizda repository konvensiyasiga mos `POST /payments/payme`).
 *
 * **Global `DomainError`/`AllExceptionsFilter` bu yerga UMUMAN YETIB
 * KELMAYDI** — controller HAR BIR xatoni (protokol, validatsiya, kutilmagan)
 * o'zi ushlab JSON-RPC `{error}` formatiga aylantiradi, HAR DOIM HTTP 200
 * bilan (bo'lim 7 — rasmiy semantika).
 */
@Public()
@ApiExcludeController()
@Controller('payments/payme')
export class PaymeMerchantController {
  private readonly logger = new Logger(PaymeMerchantController.name);
  private readonly methods: Record<string, PaymeMethodHandler>;

  constructor(
    @Inject(PAYME_MERCHANT_CONFIG) private readonly paymeConfig: PaymeMerchantConfig | null,
    private readonly service: PaymeMerchantService,
  ) {
    this.methods = {
      CheckPerformTransaction: (p) => this.service.checkPerformTransaction(p),
      CreateTransaction: (p) => this.service.createTransaction(p),
      PerformTransaction: (p) => this.service.performTransaction(p),
      CancelTransaction: (p) => this.service.cancelTransaction(p),
      CheckTransaction: (p) => this.service.checkTransaction(p),
      GetStatement: (p) => this.service.getStatement(p),
    };
  }

  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: unknown,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PaymeRpcSuccessResponse | PaymeRpcErrorResponse> {
    const id = this.extractId(body);

    // Bo'lim 4/81 — Payme faqat `PAYMENT_PROVIDER=PAYME` (VA to'liq
    // credential) bo'lganda "mavjud" — `payment.module.ts`dagi
    // `PAYME_MERCHANT_CONFIG` factory shuni hal qiladi. Boshqa muhitda
    // hech qanday metod topilmagan sifatida ko'rinadi — ichki
    // konfiguratsiya holatini oshkor qilmaydi.
    if (!this.paymeConfig) {
      return this.errorResponse(new PaymeRpcError(PAYME_ERROR.METHOD_NOT_FOUND, 'Metod topilmadi'), id);
    }
    if (!verifyPaymeBasicAuth(authorization, this.paymeConfig)) {
      // Bo'lim 5 — raw Authorization header LOG QILINMAYDI (logger.module.ts
      // global redact — `req.headers.authorization`).
      return this.errorResponse(new PaymeRpcError(PAYME_ERROR.INSUFFICIENT_PRIVILEGE, 'Avtorizatsiya xato'), id);
    }

    const rpc = this.parseRequest(body);
    if (!rpc) {
      return this.errorResponse(new PaymeRpcError(PAYME_ERROR.INVALID_REQUEST, 'So‘rov formati noto‘g‘ri'), id);
    }

    const handler = this.methods[rpc.method];
    if (!handler) {
      return this.errorResponse(new PaymeRpcError(PAYME_ERROR.METHOD_NOT_FOUND, 'Metod topilmadi'), rpc.id);
    }

    try {
      const result = await handler(rpc.params);
      return { result, id: rpc.id };
    } catch (err) {
      if (err instanceof PaymeRpcError) {
        return this.errorResponse(err, rpc.id);
      }
      // Kutilmagan (ichki) xato — mijozga hech qanday stack/SQL/sabab
      // chiqmaydi (bo'lim 43), faqat serverga to'liq log yoziladi.
      this.logger.error({ err, method: rpc.method }, 'Payme RPC kutilmagan xato');
      return this.errorResponse(new PaymeRpcError(PAYME_ERROR.INTERNAL, 'Ichki xato'), rpc.id);
    }
  }

  private parseRequest(body: unknown): { method: string; params: Record<string, unknown>; id: number | string } | null {
    if (typeof body !== 'object' || body === null) return null;
    const { method, params, id } = body as Record<string, unknown>;
    if (typeof method !== 'string' || method.length === 0) return null;
    if (typeof id !== 'number' && typeof id !== 'string') return null;
    const safeParams = typeof params === 'object' && params !== null && !Array.isArray(params) ? (params as Record<string, unknown>) : {};
    return { method, params: safeParams, id };
  }

  private extractId(body: unknown): number | string | null {
    if (typeof body !== 'object' || body === null) return null;
    const { id } = body as Record<string, unknown>;
    return typeof id === 'number' || typeof id === 'string' ? id : null;
  }

  private errorResponse(err: PaymeRpcError, id: number | string | null): PaymeRpcErrorResponse {
    return { error: { code: err.rpcCode, message: err.toMessage(), data: err.rpcData }, id };
  }
}
