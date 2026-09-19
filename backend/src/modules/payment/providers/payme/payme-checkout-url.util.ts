/**
 * Bosqich 12, bo'lim 24 — Payme GET-checkout URL formati. Manba: rasmiy
 * `developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-get/`.
 *
 * Format: `<checkout_url>/base64("m=<merchant_id>;ac.<field>=<value>;a=<amount>")`
 * — parametrlar `;` bilan ajratiladi, `key=value`, butun satr standart
 * base64 (base64url EMAS) bilan kodlanadi. Bu SINXRON, tarmoq chaqiruvisiz
 * (bo'lim 24/28 — "HTTP call qildirma").
 */
import { PAYME_ACCOUNT_FIELD } from './payme-rpc.types';
import { tiyinToPaymeAmount } from './payme-amount.util';

export interface BuildPaymeCheckoutUrlParams {
  checkoutBaseUrl: string;
  merchantId: string;
  paymentId: string;
  amountTiyin: bigint;
  /** Bo'lim 25 — faqat vizual redirect, xavfsizlik uchun ahamiyatsiz (browser bu URL'ni Payme'dan oladi). */
  returnUrl?: string;
  lang?: 'ru' | 'uz' | 'en';
}

export function buildPaymeCheckoutUrl(params: BuildPaymeCheckoutUrlParams): string {
  const amount = tiyinToPaymeAmount(params.amountTiyin);
  const segments = [`m=${params.merchantId}`, `ac.${PAYME_ACCOUNT_FIELD}=${params.paymentId}`, `a=${amount}`];
  if (params.lang) segments.push(`l=${params.lang}`);
  if (params.returnUrl) segments.push(`c=${params.returnUrl}`);

  const encoded = Buffer.from(segments.join(';'), 'utf8').toString('base64');
  const base = params.checkoutBaseUrl.replace(/\/+$/, '');
  return `${base}/${encoded}`;
}
