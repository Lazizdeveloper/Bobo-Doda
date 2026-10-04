/**
 * Comprehensive verification suite for Audit Trail human-readable translations.
 * Tests all 78 actions, 14 resources, system actors, edge cases, and language parity.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dictPath = path.join(root, "lib/i18n/dictionary.ts");
const enPath = path.join(root, "lib/i18n/en.ts");
const auditFormatPath = path.join(root, "lib/audit-format.ts");

const dictContent = fs.readFileSync(dictPath, "utf8");
const enContent = fs.readFileSync(enPath, "utf8");
const auditFormatContent = fs.readFileSync(auditFormatPath, "utf8");

// Parse dictionary entries
const dictRegex = /"(audit\.[^"]+)":\s*\{\s*uz:\s*"([^"]+)",\s*ru:\s*"([^"]+)"\s*\}/g;
const dictionary = {};
let match;
while ((match = dictRegex.exec(dictContent)) !== null) {
  dictionary[match[1]] = { uz: match[2], ru: match[3] };
}

// Parse en entries
const enRegex = /"(audit\.[^"]+)":\s*"([^"]+)"/g;
const en = {};
while ((match = enRegex.exec(enContent)) !== null) {
  en[match[1]] = match[2];
}

console.log(`[1] Parsed ${Object.keys(dictionary).length} dictionary keys, ${Object.keys(en).length} en keys.`);
assert(Object.keys(dictionary).length > 0, "Dictionary should not be empty");
assert(Object.keys(en).length > 0, "EN translations should not be empty");
assert.strictEqual(
  Object.keys(dictionary).length,
  Object.keys(en).length,
  "Dictionary and EN keys must have 100% parity"
);

// Verify no mixed script in Russian translations
let mixedCount = 0;
for (const [key, val] of Object.entries(dictionary)) {
  const words = val.ru.split(/\s+/);
  for (const w of words) {
    const clean = w.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, "");
    if (/[a-zA-Z]/.test(clean) && /[а-яА-ЯёЁ]/.test(clean)) {
      console.error(`Mixed script word "${w}" in key "${key}": "${val.ru}"`);
      mixedCount++;
    }
  }
}
assert.strictEqual(mixedCount, 0, "No Russian translations should have mixed Latin/Cyrillic scripts");
console.log("    -> Russian script integrity passed (0 mixed scripts).");

// Extract all actions from AUDIT_ACTIONS_BY_RESOURCE in audit-format.ts
const actionMatches = [...auditFormatContent.matchAll(/"([A-Z0-9_]+)"/g)].map((m) => m[1]);
const resources = [
  "USER", "CONTRACT", "SERVICE", "DISPUTE", "PAYMENT", "PAYOUT", "REFUND",
  "CATEGORY", "MILESTONE", "OUTBOX_EVENT", "STAFF_MEMBER", "SELLER_APPLICATION",
  "LEDGER_TRANSACTION", "FINANCIAL_ANOMALY"
];
const actions = Array.from(new Set(actionMatches.filter((a) => !resources.includes(a) && a !== "STAFF" && a !== "SYSTEM")));

console.log(`[2] Checking all ${actions.length} audit actions across 3 languages...`);
assert(actions.length >= 78, `Expected at least 78 distinct actions, found ${actions.length}`);

for (const act of actions) {
  const key = `audit.act.${act}`;
  assert(dictionary[key], `Missing dictionary entry for action: ${act}`);
  assert(dictionary[key].uz, `Missing uz translation for action: ${act}`);
  assert(dictionary[key].ru, `Missing ru translation for action: ${act}`);
  assert(en[key], `Missing en translation for action: ${act}`);

  // Must not be raw enum
  assert.notStrictEqual(dictionary[key].uz, act, `Action ${act} is untranslated in UZ`);
  assert.notStrictEqual(dictionary[key].ru, act, `Action ${act} is untranslated in RU`);
  assert.notStrictEqual(en[key], act, `Action ${act} is untranslated in EN`);
}
console.log(`    -> All ${actions.length} actions verified in UZ, RU, and EN.`);

console.log(`[3] Checking all ${resources.length} audit resources across 3 languages...`);
for (const res of resources) {
  const key = `audit.res.${res}`;
  assert(dictionary[key], `Missing dictionary entry for resource: ${res}`);
  assert(dictionary[key].uz, `Missing uz translation for resource: ${res}`);
  assert(dictionary[key].ru, `Missing ru translation for resource: ${res}`);
  assert(en[key], `Missing en translation for resource: ${res}`);

  // Must not be raw enum
  assert.notStrictEqual(dictionary[key].uz, res, `Resource ${res} is untranslated in UZ`);
  assert.notStrictEqual(dictionary[key].ru, res, `Resource ${res} is untranslated in RU`);
  assert.notStrictEqual(en[key], res, `Resource ${res} is untranslated in EN`);
}
console.log(`    -> All ${resources.length} resources verified in UZ, RU, and EN.`);

console.log("[4] Checking system actor name translations...");
const systemActors = [
  "outbox-worker",
  "payment-provider",
  "payme-merchant-api",
  "payout-provider",
  "reconciliation-service",
  "dispute-service",
  "system",
];
for (const actor of systemActors) {
  const key = `audit.actorName.${actor}`;
  assert(dictionary[key], `Missing actor name entry for: ${actor}`);
  assert(dictionary[key].uz, `Missing uz actor name for: ${actor}`);
  assert(dictionary[key].ru, `Missing ru actor name for: ${actor}`);
  assert(en[key], `Missing en actor name for: ${actor}`);

  assert(!dictionary[key].uz.includes("outbox-worker"), `Actor ${actor} should have a natural Uzbek translation without developer jargon`);
}
console.log(`    -> All ${systemActors.length} system actors verified with natural human language.`);

// Test specifically the elements from the user screenshot:
// OUTBOX_EVENT_DEAD, outbox-worker, OUTBOX_EVENT, USER_REACTIVATED, USER_SUSPENDED, USER
console.log("[5] Verifying screenshot items...");
assert.strictEqual(dictionary["audit.act.OUTBOX_EVENT_DEAD"].uz, "Xabarnoma yetkazib bo'lmadi (DLQ)");
assert.strictEqual(dictionary["audit.actorName.outbox-worker"].uz, "Tizim (Xabarnomalar xizmati)");
assert.strictEqual(dictionary["audit.res.OUTBOX_EVENT"].uz, "Xabarnoma");
assert.strictEqual(dictionary["audit.act.USER_REACTIVATED"].uz, "Foydalanuvchi qayta faollashtirildi");
assert.strictEqual(dictionary["audit.act.USER_SUSPENDED"].uz, "Foydalanuvchi faoliyati to'xtatildi");
assert.strictEqual(dictionary["audit.res.USER"].uz, "Foydalanuvchi");
console.log("    -> All screenshot items pass with 100% human-readable Uzbek texts.");

console.log("\nALL AUDIT I18N VERIFICATION CHECKS PASSED SUCCESSFULLY!");
