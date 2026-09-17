import { Logger } from '@nestjs/common';
import type { TextUpConfig, TextUpLoginResponse } from './textup.types';

/** Login so'rovi uchun aniq chegara (SMS so'rovi bilan bir xil qiymat). */
const REQUEST_TIMEOUT_MS = 10_000;

export interface TextUpToken {
  accessToken: string;
  /** Runtime login javobidagi `user.id` — bo'lim 8: SMS so'roviga shu qiymat qo'yiladi. */
  userId: string;
}

/**
 * TextUp accessToken FAQAT login orqali olinadi, ENV'ga qo'lda yozilmaydi
 * (hujjat "expire" deydi, lekin refresh endpoint bermaydi — o'ylab
 * TOPILMAYDI). Bitta jarayon xotirasida keshlanadi (`SmsModule`dagi
 * `SMS_PROVIDER` — Nest DI singleton, `TextUpProvider` konstruktorida
 * BITTA marta yaratiladi).
 *
 * **Bir vaqtli login deduplikatsiyasi**: bir nechta `getToken()` chaqiruvi
 * token hali yo'q paytda BARVAQT kelsa (masalan 10 ta SMS bir vaqtda
 * navbatdan chiqsa), FAQAT BITTA haqiqiy login so'rovi ketadi — qolganlari
 * O'SHA in-flight promise'ni kutadi (`this.pendingLogin`, sinxron
 * o'rnatiladi, birinchi `await`dan OLDIN — race yo'q).
 *
 * Email/parol/accessToken/refreshToken HECH QACHON loglanmaydi.
 */
export class TextUpTokenManager {
  private readonly logger = new Logger(TextUpTokenManager.name);
  private cachedToken: TextUpToken | null = null;
  private pendingLogin: Promise<TextUpToken> | null = null;

  constructor(private readonly config: TextUpConfig) {}

  async getToken(): Promise<TextUpToken> {
    if (this.cachedToken) return this.cachedToken;
    if (this.pendingLogin) return this.pendingLogin;

    this.pendingLogin = this.login();
    try {
      const token = await this.pendingLogin;
      this.cachedToken = token;
      return token;
    } finally {
      // Muvaffaqiyat HAM, xato HAM — in-flight promise'ning o'zi endi
      // kerak emas: muvaffaqiyatda `cachedToken` bor, xatoda esa keyingi
      // urinish YANGI login boshlashi kerak (bo'lim 6 — "login fails →
      // clear login promise/cache").
      this.pendingLogin = null;
    }
  }

  /** 401 kelganda chaqiriladi (bo'lim 7) — keyingi `getToken()` qayta login qiladi. */
  invalidate(): void {
    this.cachedToken = null;
    this.pendingLogin = null;
  }

  private async login(): Promise<TextUpToken> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(this.config.authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.config.email, password: this.config.password }),
        signal: controller.signal,
      });
    } catch (err) {
      this.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'TextUp login: tarmoq xatosi/timeout');
      throw new Error('TextUp login: tarmoq xatosi/timeout');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      this.logger.warn({ status: response.status }, 'TextUp login: muvaffaqiyatsiz javob');
      throw new Error(`TextUp login: HTTP ${response.status}`);
    }

    let parsed: Partial<TextUpLoginResponse>;
    try {
      parsed = (await response.json()) as Partial<TextUpLoginResponse>;
    } catch {
      throw new Error('TextUp login: javob JSON emas');
    }

    const accessToken = parsed.accessToken;
    const userId = parsed.user?.id;
    if (!accessToken || !userId) {
      throw new Error('TextUp login: javobda accessToken/user.id yo‘q');
    }

    // Bo'lim 8 — ixtiyoriy hisob-xavfsizlik assertioni: sozlangan
    // TEXTUP_EXPECTED_USER_ID berilgan bo'lsa, runtime user.id bilan
    // MOS kelishi shart (fail-closed).
    if (this.config.expectedUserId && this.config.expectedUserId !== userId) {
      this.logger.error('TextUp: TEXTUP_EXPECTED_USER_ID runtime user.id bilan mos emas — hisob sozlamasi tekshirilsin');
      throw new Error('TextUp login: expectedUserId mos emas (fail closed)');
    }

    return { accessToken, userId };
  }
}
