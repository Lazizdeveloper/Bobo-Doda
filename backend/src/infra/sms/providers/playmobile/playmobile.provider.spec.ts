import { PlayMobileProvider } from './playmobile.provider';
import { OTP_SMS_TEMPLATE } from '@/modules/auth/constants/otp.constants';

const CONFIG = { apiUrl: 'https://send.example.uz/broker-api', login: 'test-login', password: 'test-pass', sender: 'BoboDoda' };

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('PlayMobileProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('muvaffaqiyatli yuborish — success:true, providerMessageId qaytadi', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('Request is received', { status: 200 }));
    global.fetch = fetchMock;

    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', OTP_SMS_TEMPLATE, { code: '111222' });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toHaveLength(20);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://send.example.uz/broker-api/send');
    expect(init.headers).toMatchObject({ Authorization: expect.stringContaining('Basic ') });
    const body = JSON.parse(init.body as string);
    expect(body.messages[0].recipient).toBe('998901234567');
    expect(body.sms.content.text).toContain('111222');
    expect(body.sms.originator).toBe('BoboDoda');
  });

  it('avtorizatsiya xato (401) — permanent:true, xato matni xavfsiz', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('', { status: 401 }));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.success).toBe(false);
    expect(result.permanent).toBe(true);
  });

  it('rate limit (429, Retry-After) — retryAfterSeconds qaytadi, permanent EMAS', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '30' } }));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.success).toBe(false);
    expect(result.permanent).toBeUndefined();
    expect(result.retryAfterSeconds).toBe(30);
  });

  it('timeout/tarmoq xatosi — RETRYABLE (permanent berilmaydi)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.success).toBe(false);
    expect(result.permanent).toBeUndefined();
  });

  it('provider 5xx (masalan 500, JSON emas) — RETRYABLE (tasniflanmagan)', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('<html>error</html>', { status: 500 }));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.success).toBe(false);
    expect(result.permanent).toBeUndefined();
  });

  it('rasmiy error_code=100 (Internal server error) — RETRYABLE', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(400, { error_code: '100', error_description: 'Internal server error' }));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.success).toBe(false);
    expect(result.permanent).toBe(false);
  });

  it('rasmiy error_code=401 (Empty originator) — PERMANENT', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(400, { error_code: '401', error_description: 'Empty originator' }));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.success).toBe(false);
    expect(result.permanent).toBe(true);
  });

  it('malformed (JSON parse xato) javob — RETRYABLE, tashlanmaydi', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('not json{{{', { status: 400 }));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.success).toBe(false);
    expect(result.permanent).toBeUndefined();
  });

  it('yaroqsiz qabul qiluvchi (998 bilan boshlanmaydi) — HTTP chaqiruvisiz DomainError', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const provider = new PlayMobileProvider(CONFIG);
    await expect(provider.send('+1234567890', 'X', { message: 'test' })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('xom error_description javobga (SmsSendResult.errorMessage) chiqmaydi — faqat kod', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(400, { error_code: '406', error_description: 'juda maxfiy ichki tafsilot' }));
    const provider = new PlayMobileProvider(CONFIG);
    const result = await provider.send('+998901234567', 'X', { message: 'test' });
    expect(result.errorMessage).not.toContain('juda maxfiy ichki tafsilot');
  });
});
