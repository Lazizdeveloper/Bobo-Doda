import { randomInt } from 'node:crypto';

/** 6 xonali OTP kodi, kriptografik jihatdan xavfsiz tasodifiy (`crypto.randomInt`). */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
