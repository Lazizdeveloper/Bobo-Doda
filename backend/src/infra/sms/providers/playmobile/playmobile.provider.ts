import { Logger } from '@nestjs/common';
import type { SmsProvider, SmsSendResult } from '../../sms-provider.interface';
import type { PlayMobileConfig, PlayMobileErrorResponse } from './playmobile.types';
import { PLAYMOBILE_ERROR_CODES } from './playmobile.types';
import { derivePlayMobileMessageId } from './playmobile-message-id.util';
import { toPlayMobileRecipient } from './playmobile-phone.util';
import { renderPlayMobileText } from './playmobile-text.util';
import { normalizePhone } from '@/common/security/phone.util';

/** Bo'lim 8 — provider HTTP so'rovi uchun aniq chegara (bounded retry — o'zi qayta URINMAYDI, faqat vaqtida to'xtaydi). */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Bosqich 13 — PLAY MOBILE SMS-Broker HTTP API (rasmiy PDF, `playmobile.types.ts`
 * izohiga qarang). Basic auth, `POST <apiUrl>/send`. `SmsProvider` interfeysini
 * BUZMAYDI — `OtpService`/`OutboxWorkerService` bu klass haqida HECH NARSA
 * bilmaydi (bo'lim 4).
 *
 * Ikkinchi HTTP chaqiruv/ichki retry YO'Q (bo'lim 8): bitta urinish, aniq
 * timeout bilan. Qayta urinish — OTP tomonida BullMQ navbatining o'zi
 * (`OtpSmsProcessor`), Outbox tomonida Phase 10 worker — provider klassi
 * ICHIDA ikkinchi qavat retry yaratilmaydi (uncontrolled double-retry
 * xavfi, bo'lim 8's aniq ta'kidi).
 */
export class PlayMobileProvider implements SmsProvider {
  private readonly logger = new Logger(PlayMobileProvider.name);
  private readonly authHeader: string;

  constructor(private readonly config: PlayMobileConfig) {
    this.authHeader = `Basic ${Buffer.from(`${config.login}:${config.password}`, 'utf8').toString('base64')}`;
  }

  async send(
    phone: string,
    template: string,
    params: Record<string, string>,
    options?: { reference?: string },
  ): Promise<SmsSendResult> {
    const recipient = toPlayMobileRecipient(normalizePhone(phone));
    const text = renderPlayMobileText(template, params);
    const messageId = derivePlayMobileMessageId(options?.reference);

    const body = {
      sms: { originator: this.config.sender, content: { text } },
      messages: [{ recipient, 'message-id': messageId }],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${this.config.apiUrl.replace(/\/+$/, '')}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          Authorization: this.authHeader,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      // Bo'lim 9 — tarmoq xatosi/timeout: ANIQSIZ, RETRYABLE (sukut —
      // `permanent` maydoni berilmaydi).
      this.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'PlayMobile: tarmoq xatosi/timeout');
      return { success: false, errorMessage: 'SMS provider bilan bog‘lanib bo‘lmadi' };
    } finally {
      clearTimeout(timer);
    }

    if (response.ok) {
      return { success: true, providerMessageId: messageId };
    }

    if (response.status === 401 || response.status === 403) {
      // Basic auth xato — bo'lim 3/102: config muammosi, qayta urinish foyda bermaydi.
      this.logger.error('PlayMobile: avtorizatsiya xato (login/password) — SMS provayder sozlamasi tekshirilsin');
      return { success: false, errorMessage: 'SMS provider avtorizatsiyasi xato', permanent: true };
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
      return {
        success: false,
        errorMessage: 'SMS provider rate-limit',
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      };
    }

    let parsed: PlayMobileErrorResponse | undefined;
    try {
      parsed = (await response.json()) as PlayMobileErrorResponse;
    } catch {
      // Body JSON emas — tasniflanmagan, konservativ RETRYABLE.
    }

    if (parsed?.error_code) {
      const known = PLAYMOBILE_ERROR_CODES[parsed.error_code];
      // Bo'lim 9 — xom provider matni foydalanuvchiga chiqmaydi (bu
      // natija `SmsLog`/log'ga yoziladi, HTTP javobga emas — `OtpService`/
      // `OutboxWorkerService` bu satrni clientga qaytarmaydi).
      this.logger.warn({ code: parsed.error_code, description: parsed.error_description }, 'PlayMobile: xato javob');
      return {
        success: false,
        errorMessage: `SMS provider xatosi (${parsed.error_code})`,
        permanent: known ? !known.retryable : false,
      };
    }

    return { success: false, errorMessage: `SMS provider HTTP ${response.status}` };
  }
}
