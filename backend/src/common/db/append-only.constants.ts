/**
 * A4/T2 — append-only jadvallar ro'yxati UCHUN YAGONA MANBA.
 *
 * Ilgari bu ro'yxat ikki joyda mustaqil yozilgan edi (migratsiyadagi
 * `REVOKE` va F1 tekshiruvi) — Bosqich 4'da `ledger_entries` qo'shilganda
 * kimdir bitta joyni unutishi mumkin edi, va aynan unutilgan joy himoya
 * bo'lardi. Endi:
 *   • `db-role-assertion.ts` (`checkDbRoleHardening`) shu obyektni aylanib
 *     chiqadi — yangi yozuv qo'shsangiz, F1 AVTOMATIK uni tekshira boshlaydi.
 *   • Migratsiya SQL'i (`prisma/migrations/.../migration.sql`) BU FAYLGA
 *     QARAB QO'LDA yoziladi (Prisma migratsiyalari statik SQL — TS'dan
 *     avtomatik generatsiya qilinmaydi). Muvofiqlikni
 *     `test/db-role-assertion.e2e-spec.ts` dagi "happy path" testi TEKSHIRADI:
 *     u shu ro'yxatni real, migratsiya qo'llangan DB'ga solishtiradi — agar
 *     migratsiyaga yangi jadval uchun REVOKE qo'shilmagan bo'lsa, o'sha test
 *     QIZARADI (bu — "generatsiya murakkab bo'lsa, test SQL'ni tekshiradi"
 *     degan yengilroq yo'l, lekin matn solishtirish emas: haqiqiy DB
 *     huquqlarini so'raydi, shuning uchun SQL formatlash o'zgarsa ham
 *     yolg'on qizarmaydi).
 *
 * **Bosqich 4 qo'llanmasi:** `ledger_entries` qo'shilganda shu obyektga
 * bitta qator qo'shing VA `migration.sql`ga mos `REVOKE` yozing (yuqoridagi
 * test buni eslatadi — unutsangiz qizil bo'ladi).
 */
export interface AppendOnlyTableRule {
  /** `bobododa_app` dan olib qo'yiladigan huquqlar (butun jadval darajasida). */
  revoke: readonly string[];
  /**
   * Ushbu ustunlarga UPDATE qoldiriladi (masalan worker holat ustunlari).
   * Bo'sh massiv — jadval TO'LIQ append-only (UPDATE umuman yo'q).
   */
  allowUpdateColumns: readonly string[];
}

export const APPEND_ONLY_TABLES = {
  audit_logs: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  outbox_events: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: ['status', 'attempts', 'lastError', 'availableAt', 'processedAt'],
  },
  // Bosqich 4 (Contract/Milestone) — ish topshirish/o'zgartirish so'rovi
  // tarixi. `AuditLog`dan alohida (bo'lim 16: domain history vs security
  // audit), lekin xuddi shunday HECH QACHON o'zgartirilmaydi/o'chirilmaydi.
  milestone_submissions: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  milestone_revision_requests: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  // Bosqich 5 (Payment) — webhook qabul qilish/dedup jurnali. Insert-once
  // naqsh (natija SHU BITTA `create()` chaqiruvida allaqachon hisoblab
  // yozilgan bo'ladi — bo'lim 18/54), shuning uchun `milestone_submissions`
  // bilan bir xil TO'LIQ append-only siyosat.
  payment_provider_events: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  // Bosqich 6 (Ledger) — double-entry buxgalteriya yozuvlari. Xato tuzatish
  // FAQAT kelajakdagi reversal-journal orqali (bo'lim 20/49) — eski qator
  // HECH QACHON UPDATE/DELETE qilinmaydi. `ledger_accounts` ham TO'LIQ
  // append-only: identifikatsiya maydonlari (type/owner/currency)
  // yaratilgach o'zgarmasligi SHART (masalan bitta hisobning valyutasi
  // keyin "USD"ga almashtirilib qo'yilishi — jiddiy moliyaviy xato bo'lardi).
  // Parallel-birinchi-marta-yaratish poygasi (bo'lim 42) UPDATE huquqi
  // orqali EMAS, `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` orqali yechiladi
  // (`LedgerService.getOrCreateUserAccount()`) — shuning uchun UPDATE
  // huquqiga UMUMAN ehtiyoj yo'q.
  ledger_accounts: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  ledger_transactions: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  ledger_entries: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  // Bosqich 7 (Refund/Payout) — `payment_provider_events` bilan BIR XIL
  // insert-once dedup/tarix jurnali, xuddi shu TO'LIQ append-only siyosat.
  refund_provider_events: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
  payout_provider_events: {
    revoke: ['UPDATE', 'DELETE'],
    allowUpdateColumns: [],
  },
} as const satisfies Record<string, AppendOnlyTableRule>;

export type AppendOnlyTableName = keyof typeof APPEND_ONLY_TABLES;
