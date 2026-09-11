import type { Logger } from '@nestjs/common';

/**
 * F1 — Boot paytidagi rol/append-only tekshiruvi (fail closed).
 *
 * A4 append-only'ni DB darajasida majburlaydi, lekin buni HECH KIM
 * tekshirmasa — himoya bor deb o'ylaysan, aslida yo'q bo'lib qolishi mumkin:
 *   • Managed Postgres'da (`docker/initdb/10-roles.sh` ishlamaydi — u faqat
 *     yangi konteynerning birinchi ko'tarilishida ishlaydi) rollar hech
 *     qachon qo'lda yaratilmasa,
 *   • yoki kimdir shoshilinch holatda `DATABASE_URL`ga `bobododa_migrator`
 *     ulanish satrini qo'ysa (hammasi "ishlaydi", testlar committa yashil,
 *     lekin `audit_logs` yana o'zgartirilishi mumkin) —
 * hech qanday signal bo'lmaydi. Shu yerda signal beramiz: agar runtime rol
 * noto'g'ri bo'lsa yoki append-only buzilgan bo'lsa, ilova UMUMAN
 * ko'tarilmaydi.
 */

export const EXPECTED_APP_DB_ROLE = 'bobododa_app';

const APPEND_ONLY_CHECKS: ReadonlyArray<{ table: string; privilege: string }> = [
  { table: 'audit_logs', privilege: 'UPDATE' },
  { table: 'audit_logs', privilege: 'DELETE' },
  { table: 'outbox_events', privilege: 'DELETE' },
];

const REQUIRED_EXTENSIONS = ['pg_trgm', 'unaccent', 'citext', 'btree_gin'] as const;

/** Faqat shu funksiya chaqiradigan minimal Prisma interfeysi — testda mock/real bir xil ishlaydi. */
export interface DbRoleAssertionQueryer {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

export interface DbRoleAssertionResult {
  currentUser: string;
  /** Bo'sh bo'lsa — tekshiruv o'tdi. */
  failures: string[];
}

/** `rows[0]` — bittasi kelishi kafolatlangan SQL uchun (`noUncheckedIndexedAccess` bilan xavfsiz). */
function firstRow<T>(rows: T[], query: string): T {
  const row = rows[0];
  if (!row) throw new Error(`DB rol tekshiruvi: kutilmagan bo'sh natija — "${query}"`);
  return row;
}

/** Faqat tekshiradi, hech narsa tashlamaydi (test uchun ham qulay). */
export async function checkDbRoleHardening(db: DbRoleAssertionQueryer): Promise<DbRoleAssertionResult> {
  const failures: string[] = [];

  const userRows = await db.$queryRawUnsafe<{ current_user: string }[]>('SELECT current_user');
  const { current_user: currentUser } = firstRow(userRows, 'SELECT current_user');

  if (currentUser !== EXPECTED_APP_DB_ROLE) {
    failures.push(
      `current_user = "${currentUser}", kutilgan "${EXPECTED_APP_DB_ROLE}". ` +
        `DATABASE_URL runtime uchun "${EXPECTED_APP_DB_ROLE}" rolini ishlatishi shart ` +
        `("bobododa_migrator" FAQAT "prisma migrate" uchun).`,
    );
  }

  // has_table_privilege(table, priv) ikki argumentli shakli current_user'ni
  // ICHIDAN oladi — shuning uchun boshqa rol bilan ulanilganda ham to'g'ri
  // (o'sha rol uchun) tekshiradi.
  for (const { table, privilege } of APPEND_ONLY_CHECKS) {
    const query = `SELECT has_table_privilege('public.${table}', '${privilege}') AS has`;
    const rows = await db.$queryRawUnsafe<{ has: boolean }[]>(query);
    const { has } = firstRow(rows, query);
    if (has) {
      failures.push(
        `"${currentUser}" roli "${table}" ustida ${privilege} huquqiga EGA — append-only buzilgan. ` +
          `Init migratsiyadagi REVOKE qo'llanmagan (odatda: rollar migratsiyadan OLDIN yaratilmagan).`,
      );
    }
  }

  const extRows = await db.$queryRawUnsafe<{ extname: string }[]>(
    `SELECT extname FROM pg_extension WHERE extname IN (${REQUIRED_EXTENSIONS.map((e) => `'${e}'`).join(', ')})`,
  );
  const present = new Set(extRows.map((r) => r.extname));
  const missing = REQUIRED_EXTENSIONS.filter((e) => !present.has(e));
  if (missing.length > 0) {
    failures.push(
      `Kengaytmalar yetishmayapti: ${missing.join(', ')} — migratsiya to'liq qo'llanmagan yoki ` +
        `"bobododa_migrator" DB ustidan CREATE huquqiga ega emas edi.`,
    );
  }

  return { currentUser, failures };
}

/**
 * Tekshiradi va muvaffaqiyatsiz bo'lsa TASHLAYDI — ilova ko'tarilmasin.
 * `enabled: false` faqat dev/test uchun (env darajasida prod'da imkonsiz —
 * `env.schema.ts`).
 */
export async function assertDbRoleHardening(
  db: DbRoleAssertionQueryer,
  opts: { enabled: boolean; logger?: Pick<Logger, 'warn'> },
): Promise<void> {
  if (!opts.enabled) {
    opts.logger?.warn(
      "DB_ROLE_ASSERTION=off — rol/append-only tekshiruvi O'TKAZIB YUBORILDI (faqat dev/test; production'da imkonsiz).",
    );
    return;
  }

  const { failures } = await checkDbRoleHardening(db);
  if (failures.length === 0) return;

  throw new Error(
    [
      "DB rol/append-only tekshiruvi (F1) YIQILDI — ilova KO'TARILMAYDI:",
      ...failures.map((f) => `  • ${f}`),
      '',
      "Tuzatish (managed Postgres yoki qo'lda sozlangan klaster):",
      '  1. Superuser bilan bir marta: backend/prisma/sql/roles.sql ni qo\'llang',
      '     (psql "$SUPERUSER_URL" -v app_pw=… -v migrator_pw=… -v db_name=… -f backend/prisma/sql/roles.sql)',
      '  2. DATABASE_MIGRATION_URL=<bobododa_migrator ulanish satri> npx prisma migrate deploy',
      "  3. DATABASE_URL runtime uchun \"bobododa_app\" rolini ishlatsin (migrator EMAS).",
      '  Batafsil qadamlar: docs/RUNBOOK.md §3.',
    ].join('\n'),
  );
}
