import type { Logger } from '@nestjs/common';
import { APPEND_ONLY_TABLES } from '@/common/db/append-only.constants';

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
 *
 * T1 — kutilgan rol nomi QATTIQ YOZILMAGAN: chaqiruvchi beradi
 * (`AppConfigService.dbAppRole` ← `DB_APP_ROLE` env, sukut `bobododa_app`).
 * T2 — tekshiriladigan jadval/huquq ro'yxati `common/db/append-only.constants.ts`
 * dan olinadi — yagona manba, ikki joyda mustaqil yozilmagan.
 */

export const DEFAULT_APP_DB_ROLE = 'bobododa_app';

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

/**
 * Faqat tekshiradi, hech narsa tashlamaydi (test uchun ham qulay).
 * `expectedRole` — runtime uchun kutilgan rol nomi (`AppConfigService.dbAppRole`).
 */
export async function checkDbRoleHardening(
  db: DbRoleAssertionQueryer,
  expectedRole: string = DEFAULT_APP_DB_ROLE,
): Promise<DbRoleAssertionResult> {
  const failures: string[] = [];

  const userRows = await db.$queryRawUnsafe<{ current_user: string }[]>('SELECT current_user');
  const { current_user: currentUser } = firstRow(userRows, 'SELECT current_user');

  if (currentUser !== expectedRole) {
    failures.push(
      `current_user = "${currentUser}", kutilgan "${expectedRole}" (DB_APP_ROLE). ` +
        `DATABASE_URL runtime uchun shu rolni ishlatishi shart ` +
        `("bobododa_migrator" FAQAT "prisma migrate" uchun).`,
    );
  }

  // has_table_privilege(table, priv) ikki argumentli shakli current_user'ni
  // ICHIDAN oladi — shuning uchun boshqa rol bilan ulanilganda ham to'g'ri
  // (o'sha rol uchun) tekshiradi. T2: ro'yxat APPEND_ONLY_TABLES'dan —
  // Bosqich 4'da ledger_entries qo'shilsa, shu yerga QO'L TEGMAYDI.
  for (const [table, rule] of Object.entries(APPEND_ONLY_TABLES)) {
    for (const privilege of rule.revoke) {
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

    // Qoldirilgan ustunlar HAQIQATAN ham UPDATE qilinadigan bo'lishi kerak
    // (aks holda outbox worker/vergilgan funksiya sukut ravishda buziladi —
    // bu ham append-only ro'yxati bilan migratsiya orasidagi drift signali).
    for (const column of rule.allowUpdateColumns) {
      const query = `SELECT has_column_privilege('public.${table}', '${column}', 'UPDATE') AS has`;
      const rows = await db.$queryRawUnsafe<{ has: boolean }[]>(query);
      const { has } = firstRow(rows, query);
      if (!has) {
        failures.push(
          `"${currentUser}" roli "${table}"."${column}" ustuniga UPDATE huquqiga EGA EMAS — ` +
            `append-only-constants.ts "allowUpdateColumns" ro'yxati bilan migratsiya mos kelmayapti.`,
        );
      }
    }
  }

  const requiredExtensions = ['pg_trgm', 'unaccent', 'citext', 'btree_gin'];
  const extRows = await db.$queryRawUnsafe<{ extname: string }[]>(
    `SELECT extname FROM pg_extension WHERE extname IN (${requiredExtensions.map((e) => `'${e}'`).join(', ')})`,
  );
  const present = new Set(extRows.map((r) => r.extname));
  const missing = requiredExtensions.filter((e) => !present.has(e));
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
  opts: { enabled: boolean; expectedRole?: string; logger?: Pick<Logger, 'warn'> },
): Promise<void> {
  const expectedRole = opts.expectedRole ?? DEFAULT_APP_DB_ROLE;

  if (!opts.enabled) {
    opts.logger?.warn(
      "DB_ROLE_ASSERTION=off — rol/append-only tekshiruvi O'TKAZIB YUBORILDI (faqat dev/test; production'da imkonsiz).",
    );
    return;
  }

  const { failures } = await checkDbRoleHardening(db, expectedRole);
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
      `  3. DATABASE_URL runtime uchun "${expectedRole}" rolini ishlatsin (migrator EMAS; DB_APP_ROLE bilan mos).`,
      '  Batafsil qadamlar: docs/RUNBOOK.md §3.',
    ].join('\n'),
  );
}
