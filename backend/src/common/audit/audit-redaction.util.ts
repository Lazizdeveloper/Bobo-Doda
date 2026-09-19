/**
 * Bosqich 11, bo'lim 37 — himoya qatlami: `AuditLog.previousState`/`newState`
 * yozuvchilar (barcha `audit.record()` chaqiruvchilari) sir QO'YMASLIGI
 * KERAK (mavjud intizom — Bosqich 3'dan buyon shu qoidaga rioya qilingan),
 * lekin `GET /staff/audit-logs` JAVOBIDA qo'shimcha, DEFENSIV filtr —
 * agar biror joyda chaqiruvchi bilmasdan sezgir kalit nomi (masalan
 * "password"/"secret"/"token") qo'shib qo'ysa, staff javobida HAM
 * ko'rinmasin.
 *
 * Chuqur (recursive), lekin CHEKLANGAN chuqurlik bilan — audit metadata
 * odatda yassi/kam-qatlamli bo'ladi, cheksiz rekursiya xavfi yo'q.
 */
const SENSITIVE_KEY_PATTERN = /password|secret|totp|token|hash|authorization|cookie/i;
const MAX_DEPTH = 6;

export function redactSensitiveJson(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveJson(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSensitiveJson(val, depth + 1);
  }
  return out;
}
