/**
 * Global API prefiksi — YAGONA MANBA.
 *
 * Bo'lim 25 audit topilmasi: `backend/scripts/emit-openapi.ts` shu prefiksni
 * ILGARI umuman o'rnatmagan edi (faqat `main.ts` va `test/support/build-app.ts`
 * o'z literal nusxasini yozardi) — natijada committed `packages/contracts/
 * openapi.json` prefikssiz yo'llarni hujjatlashtirar edi, real server esa
 * (`/docs-json`) prefiks bilan javob berardi. CI contracts-drift gate buni
 * TUTOLMASDI, chunki emitter o'zi bilan o'zini solishtirardi.
 *
 * Endi UCHALASI HAM shu bitta konstantani import qiladi — prefiks o'zgarsa
 * (yoki tasodifan boshqacha yozilsa) `generate:contracts` haqiqiy diff
 * ko'rsatadi.
 */
export const API_GLOBAL_PREFIX = 'api/v1';

/** Prefiksdan tashqarida qoladigan yo'llar — health check va API docs. */
export const API_GLOBAL_PREFIX_EXCLUDE = ['health', 'health/live', 'health/ready', 'docs', 'docs-json'];
