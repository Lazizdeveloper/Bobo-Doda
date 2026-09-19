import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { RequestOtpDto } from './dto/request-otp.dto';

/**
 * OTP siyosati — "SMS ONLY" qoidasini statik audit qiladi: backend `src/`
 * ostida email yoki Telegram orqali OTP yuborish kod yo'li YO'Qligini
 * tasdiqlaydi. Legitim, OTP'ga aloqasi yo'q Telegram support integratsiyasi
 * (`TELEGRAM_BOT_TOKEN` — frontend `app/api/support/route.ts`, ushbu
 * backend `src/`dan tashqarida) bu qidiruvga kirmaydi.
 */
const SRC_ROOT = join(__dirname, '..', '..');

const FORBIDDEN_PATTERNS: RegExp[] = [
  /EmailOtpService/,
  /sendOtpEmail/i,
  /sendOtpToTelegram/i,
  /telegramVerification/i,
  /verifyEmailOtp/i,
  /EMAIL_OTP/,
  /TELEGRAM_OTP/,
];

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectTsFiles(full, out);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts') && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('OTP siyosati — statik audit (SMS ONLY)', () => {
  it('backend src/ ostida email/Telegram OTP kod yo‘li yo‘q', () => {
    const files = collectTsFiles(SRC_ROOT);
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${file.replace(SRC_ROOT, 'src')} -> ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('RequestOtpDto manbasida "channel" maydoni yo‘q (faqat phone)', () => {
    const dtoSource = readFileSync(join(__dirname, 'dto', 'request-otp.dto.ts'), 'utf8');
    expect(dtoSource).not.toMatch(/channel/i);
    expect(RequestOtpDto).toBeDefined();
  });
});
