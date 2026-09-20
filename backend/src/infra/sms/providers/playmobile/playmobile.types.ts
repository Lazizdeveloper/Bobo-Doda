/**
 * Bosqich 13 — PLAY MOBILE SMS-Broker HTTP API. Manba: rasmiy PDF
 * (`https://playmobile.uz/instruction/` → "HTTP Protocol" havolasi,
 * `https://playmobile.uz/storage/2022/08/http.pdf`, 2026-09 holatiga
 * ko'ra tekshirilgan). Har bir maydon nomi/xato kodi hujjatdan olingan.
 */

/** Bo'lim 1.2/1.3 — xato javobi (HTTP 400). */
export interface PlayMobileErrorResponse {
  error_code: string;
  error_description: string;
}

/**
 * Rasmiy "Таблица 2.2 – Коды ошибок". Deyarli barchasi DETERMINISTIK
 * so'rov xatosi (bizning tomonimizdan tuzatilishi kerak — qayta urinish
 * yordam bermaydi) — FAQAT `100` (Internal server error) haqiqatan
 * o'tkinchi. Ro'yxatda YO'Q/tanilmagan kod — konservativ RETRYABLE
 * (interfeys hujjatidagi sukut qoida: "aniq emasmi — qayta urinib ko'r").
 */
export const PLAYMOBILE_ERROR_CODES: Record<string, { retryable: boolean; description: string }> = {
  '100': { retryable: true, description: 'Internal server error' },
  '101': { retryable: false, description: 'Syntax error' },
  '102': { retryable: false, description: 'Account lock' },
  '103': { retryable: false, description: 'Empty channel' },
  '104': { retryable: false, description: 'Invalid priority' },
  '105': { retryable: false, description: 'Too much IDs' },
  '202': { retryable: false, description: 'Empty recipient' },
  '204': { retryable: false, description: 'Empty email address' },
  '205': { retryable: false, description: 'Empty message-id' },
  '206': { retryable: false, description: 'Invalid variables' },
  '301': { retryable: false, description: 'Invalid localtime' },
  '302': { retryable: false, description: 'Invalid start-datetime' },
  '303': { retryable: false, description: 'Invalid end-datetime' },
  '304': { retryable: false, description: 'Invalid allowed-starttime' },
  '305': { retryable: false, description: 'Invalid allowed-endtime' },
  '306': { retryable: false, description: 'Invalid send-evenly' },
  '401': { retryable: false, description: 'Empty originator' },
  '402': { retryable: false, description: 'Empty application' },
  '403': { retryable: false, description: 'Empty ttl' },
  '404': { retryable: false, description: 'Empty content' },
  '405': { retryable: false, description: 'Content error' },
  '406': { retryable: false, description: 'Invalid content' },
  '407': { retryable: false, description: 'Invalid ttl' },
  '408': { retryable: false, description: 'Invalid attached files' },
  '410': { retryable: false, description: 'Invalid retry-attempts' },
  '411': { retryable: false, description: 'Invalid retry-timeout' },
};

export interface PlayMobileConfig {
  apiUrl: string;
  login: string;
  password: string;
  /** Bo'lim 4 — max 11 belgi (rasmiy hujjat: "не более, чем из 11 разрешенных символов"). */
  sender: string;
}
