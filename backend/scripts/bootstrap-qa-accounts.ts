/**
 * Bobololadono — Controlled One-Time Multi-Panel QA Accounts Bootstrap & Verification.
 *
 * Yaratadi:
 *   - 5 BUYER accounts (QA-BUYER-01 .. QA-BUYER-05)
 *   - 5 FREELANCER/SELLER accounts (QA-SELLER-01 .. QA-SELLER-05)
 *   - 5 ADMIN/STAFF accounts (QA-ADMIN-01 .. QA-ADMIN-05)
 *   JAMI: 15 ta hisob
 *
 * XAVFSIZLIK:
 *   - OTP global o'chirilmaydi.
 *   - TextUp chaqirilmaydi (SMS_COUNT = 0).
 *   - SUPER_ADMIN yaratilmaydi (barcha adminlar: StaffRole.ADMIN).
 *   - Parollar konsolga/chatga/logga chiqarilmaydi.
 *   - Parollar faqat ~/.bobololadono-secrets/qa-accounts-2026-09-29.txt ga (chmod 600) yoziladi.
 *   - Idempotent: qayta ishga tushirish xavfsiz.
 *   - Haqiqiy foydalanuvchilar bilan to'qnashuv bo'lsa darhol to'xtaydi (STOP).
 *
 * Ishlatish:
 *   nix-shell shell.nix --run "DATABASE_URL=... node -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/bootstrap-qa-accounts.ts"
 *   nix-shell shell.nix --run "DATABASE_URL=... node -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/bootstrap-qa-accounts.ts --verify"
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as argon2 from 'argon2';
import { uuidv7 } from 'uuidv7';
import {
  PrismaClient,
  Role,
  SellerApplicationStatus,
  SellerStatus,
  StaffPermission,
  StaffRole,
  StaffStatus,
  UserStatus,
} from '@prisma/client';

export const SECRETS_FILE_PATH = path.join(
  os.homedir(),
  '.bobololadono-secrets',
  'qa-accounts-2026-09-29.txt',
);

export interface AccountSpec {
  code: string;
  category: 'BUYER' | 'SELLER' | 'ADMIN';
  login: string; // phone or email
  fullName: string;
  title?: string;
  role?: StaffRole;
  permissions?: StaffPermission[];
}

export const QA_ACCOUNTS: AccountSpec[] = [
  // ── BUYERS (5 ta) ──────────────────────────────────────────────────────────
  { code: 'QA-BUYER-01', category: 'BUYER', login: '+998900000001', fullName: 'QA Buyer 01' },
  { code: 'QA-BUYER-02', category: 'BUYER', login: '+998900000002', fullName: 'QA Buyer 02' },
  { code: 'QA-BUYER-03', category: 'BUYER', login: '+998900000003', fullName: 'QA Buyer 03' },
  { code: 'QA-BUYER-04', category: 'BUYER', login: '+998900000004', fullName: 'QA Buyer 04' },
  { code: 'QA-BUYER-05', category: 'BUYER', login: '+998900000005', fullName: 'QA Buyer 05' },

  // ── SELLERS (5 ta) ─────────────────────────────────────────────────────────
  { code: 'QA-SELLER-01', category: 'SELLER', login: '+998900000006', fullName: 'QA Seller 01' },
  { code: 'QA-SELLER-02', category: 'SELLER', login: '+998900000007', fullName: 'QA Seller 02' },
  { code: 'QA-SELLER-03', category: 'SELLER', login: '+998900000008', fullName: 'QA Seller 03' },
  { code: 'QA-SELLER-04', category: 'SELLER', login: '+998900000009', fullName: 'QA Seller 04' },
  { code: 'QA-SELLER-05', category: 'SELLER', login: '+998900000010', fullName: 'QA Seller 05' },

  // ── ADMINS (5 ta) ──────────────────────────────────────────────────────────
  {
    code: 'QA-ADMIN-01',
    category: 'ADMIN',
    login: 'qa-admin-01@qa.bobololadono.uz',
    fullName: 'QA Admin 01',
    title: 'QA Operations Specialist',
    role: StaffRole.ADMIN,
    permissions: [
      StaffPermission.DASHBOARD,
      StaffPermission.USERS,
      StaffPermission.SERVICES,
      StaffPermission.ORDERS,
    ],
  },
  {
    code: 'QA-ADMIN-02',
    category: 'ADMIN',
    login: 'qa-admin-02@qa.bobololadono.uz',
    fullName: 'QA Admin 02',
    title: 'QA User & Seller Specialist',
    role: StaffRole.ADMIN,
    permissions: [
      StaffPermission.DASHBOARD,
      StaffPermission.USERS,
      StaffPermission.KYC,
    ],
  },
  {
    code: 'QA-ADMIN-03',
    category: 'ADMIN',
    login: 'qa-admin-03@qa.bobololadono.uz',
    fullName: 'QA Admin 03',
    title: 'QA Contracts & Disputes Specialist',
    role: StaffRole.ADMIN,
    permissions: [
      StaffPermission.DASHBOARD,
      StaffPermission.ORDERS,
      StaffPermission.DISPUTES,
      StaffPermission.PAYMENTS,
    ],
  },
  {
    code: 'QA-ADMIN-04',
    category: 'ADMIN',
    login: 'qa-admin-04@qa.bobololadono.uz',
    fullName: 'QA Admin 04',
    title: 'QA Services & Categories Specialist',
    role: StaffRole.ADMIN,
    permissions: [
      StaffPermission.DASHBOARD,
      StaffPermission.SERVICES,
      StaffPermission.CATEGORIES,
    ],
  },
  {
    code: 'QA-ADMIN-05',
    category: 'ADMIN',
    login: 'qa-admin-05@qa.bobololadono.uz',
    fullName: 'QA Admin 05',
    title: 'QA Audit & Support Specialist',
    role: StaffRole.ADMIN,
    permissions: [
      StaffPermission.DASHBOARD,
      StaffPermission.AUDIT,
      StaffPermission.SUPPORT,
      StaffPermission.REPORTS,
      StaffPermission.APPEALS,
      StaffPermission.REVIEWS,
    ],
  },
];

/**
 * 24 belgili kuchli unikal vaqtinchalik parol yasaydi.
 */
function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*()-_=+';
  const all = upper + lower + digits + special;

  const chars: string[] = [];
  for (let i = 0; i < 3; i++) chars.push(upper[crypto.randomInt(upper.length)]);
  for (let i = 0; i < 3; i++) chars.push(lower[crypto.randomInt(lower.length)]);
  for (let i = 0; i < 3; i++) chars.push(digits[crypto.randomInt(digits.length)]);
  for (let i = 0; i < 3; i++) chars.push(special[crypto.randomInt(special.length)]);
  while (chars.length < 24) chars.push(all[crypto.randomInt(all.length)]);

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Mavjud secrets faylidan parollarni o'qiydi (idempotentlik uchun).
 */
export function loadExistingSecrets(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(filePath)) return map;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let currentCode = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('QA-')) {
      currentCode = trimmed;
    } else if (trimmed.startsWith('password:') && currentCode) {
      const pwd = trimmed.replace('password:', '').trim();
      if (pwd) map.set(currentCode, pwd);
    }
  }
  return map;
}

/**
 * Plaintext hisob ma'lumotlarini qat'iy 0600 huquqi bilan faylga saqlaydi.
 */
export function saveSecretsFile(
  filePath: string,
  accountMap: Map<string, string>,
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  let text = '# BOBOLOLADONO QA ACCOUNTS — GENERATED CREDENTIALS\n';
  text += `# Date: ${new Date().toISOString()}\n`;
  text += '# CONFIDENTIAL — QA USE ONLY — DO NOT COMMIT OR SHARE\n\n';

  text += '[BUYERS]\n\n';
  for (const a of QA_ACCOUNTS.filter((x) => x.category === 'BUYER')) {
    const pwd = accountMap.get(a.code) ?? '';
    text += `${a.code}\nlogin: ${a.login}\npassword: ${pwd}\n\n`;
  }

  text += '[SELLERS]\n\n';
  for (const a of QA_ACCOUNTS.filter((x) => x.category === 'SELLER')) {
    const pwd = accountMap.get(a.code) ?? '';
    text += `${a.code}\nlogin: ${a.login}\npassword: ${pwd}\n\n`;
  }

  text += '[ADMINS]\n\n';
  for (const a of QA_ACCOUNTS.filter((x) => x.category === 'ADMIN')) {
    const pwd = accountMap.get(a.code) ?? '';
    text += `${a.code}\nlogin: ${a.login}\npassword: ${pwd}\nrole: ${a.role}\npermissions: ${a.permissions?.join(', ')}\n\n`;
  }

  fs.writeFileSync(filePath, text, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

export async function bootstrapAccounts(prisma: PrismaClient): Promise<{
  created: number;
  existing: number;
  secretsPath: string;
}> {
  console.log('── Step 1: Parollarni tayyorlash (Secrets Store) ──');
  const existingMap = loadExistingSecrets(SECRETS_FILE_PATH);
  const finalMap = new Map<string, string>();

  let newPasswordsGenerated = 0;
  for (const acc of QA_ACCOUNTS) {
    if (existingMap.has(acc.code)) {
      finalMap.set(acc.code, existingMap.get(acc.code)!);
    } else {
      finalMap.set(acc.code, generateStrongPassword());
      newPasswordsGenerated++;
    }
  }

  saveSecretsFile(SECRETS_FILE_PATH, finalMap);
  console.log(`[SECRETS] Saqlandi: ${SECRETS_FILE_PATH} (chmod 600, yangi: ${newPasswordsGenerated})`);

  console.log('── Step 2: Database tekshiruvi va xavfsiz bootstrap ──');
  let createdCount = 0;
  let existingCount = 0;

  for (const acc of QA_ACCOUNTS) {
    const password = finalMap.get(acc.code)!;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    if (acc.category === 'BUYER') {
      const existing = await prisma.user.findUnique({ where: { phone: acc.login } });
      if (existing) {
        if (!existing.fullName?.startsWith('QA Buyer')) {
          throw new Error(
            `XAVFSIZLIK TO'XTATISHI: ${acc.login} raqami QA bo'lmagan foydalanuvchiga (${existing.fullName ?? existing.id}) tegishli!`,
          );
        }
        // QA hisobini kerakli holatda yangilash / idempotent tasdiqlash
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            roles: [Role.BUYER],
            roleChosen: true,
            lastActiveRole: Role.BUYER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.NOT_APPLIED,
            passwordHash,
          },
        });
        console.log(`[BUYER] ${acc.code} (${acc.login}) — mavjud, holati yangilandi/tasdiqlandi.`);
        existingCount++;
      } else {
        await prisma.user.create({
          data: {
            id: uuidv7(),
            phone: acc.login,
            fullName: acc.fullName,
            passwordHash,
            roles: [Role.BUYER],
            roleChosen: true,
            lastActiveRole: Role.BUYER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.NOT_APPLIED,
          },
        });
        console.log(`[BUYER] ${acc.code} (${acc.login}) — yaratildi (ACTIVE, BUYER).`);
        createdCount++;
      }
    } else if (acc.category === 'SELLER') {
      const existing = await prisma.user.findUnique({
        where: { phone: acc.login },
        include: { sellerApplications: true },
      });

      if (existing) {
        if (!existing.fullName?.startsWith('QA Seller')) {
          throw new Error(
            `XAVFSIZLIK TO'XTATISHI: ${acc.login} raqami QA bo'lmagan foydalanuvchiga (${existing.fullName ?? existing.id}) tegishli!`,
          );
        }
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            roles: [Role.SELLER],
            roleChosen: true,
            lastActiveRole: Role.SELLER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.APPROVED,
            passwordHash,
          },
        });

        if (existing.sellerApplications.length === 0) {
          await prisma.sellerApplication.create({
            data: {
              id: uuidv7(),
              userId: existing.id,
              legalName: acc.fullName,
              displayName: acc.fullName,
              description: 'QA Verified Freelancer/Seller Account',
              status: SellerApplicationStatus.APPROVED,
              submittedAt: new Date(),
              reviewedAt: new Date(),
            },
          });
        }
        console.log(`[SELLER] ${acc.code} (${acc.login}) — mavjud, holati yangilandi/tasdiqlandi.`);
        existingCount++;
      } else {
        const userId = uuidv7();
        await prisma.user.create({
          data: {
            id: userId,
            phone: acc.login,
            fullName: acc.fullName,
            passwordHash,
            roles: [Role.SELLER],
            roleChosen: true,
            lastActiveRole: Role.SELLER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.APPROVED,
          },
        });
        await prisma.sellerApplication.create({
          data: {
            id: uuidv7(),
            userId,
            legalName: acc.fullName,
            displayName: acc.fullName,
            description: 'QA Verified Freelancer/Seller Account',
            status: SellerApplicationStatus.APPROVED,
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
        });
        console.log(`[SELLER] ${acc.code} (${acc.login}) — yaratildi (ACTIVE, SELLER, APPROVED).`);
        createdCount++;
      }
    } else if (acc.category === 'ADMIN') {
      const existing = await prisma.staffMember.findUnique({ where: { email: acc.login } });
      if (existing) {
        if (!existing.fullName?.startsWith('QA Admin')) {
          throw new Error(
            `XAVFSIZLIK TO'XTATISHI: ${acc.login} emaili QA bo'lmagan xodimga (${existing.fullName ?? existing.id}) tegishli!`,
          );
        }
        await prisma.staffMember.update({
          where: { id: existing.id },
          data: {
            fullName: acc.fullName,
            title: acc.title!,
            role: acc.role!,
            permissions: acc.permissions!,
            status: StaffStatus.ACTIVE,
            mustChangePassword: false,
            mfaEnabled: false,
            passwordHash,
          },
        });
        console.log(`[ADMIN] ${acc.code} (${acc.login}) — mavjud, holati yangilandi/tasdiqlandi.`);
        existingCount++;
      } else {
        await prisma.staffMember.create({
          data: {
            id: uuidv7(),
            email: acc.login,
            fullName: acc.fullName,
            title: acc.title!,
            passwordHash,
            role: acc.role!,
            permissions: acc.permissions!,
            status: StaffStatus.ACTIVE,
            mustChangePassword: false,
            mfaEnabled: false,
          },
        });
        console.log(`[ADMIN] ${acc.code} (${acc.login}) — yaratildi (ACTIVE, StaffRole.ADMIN).`);
        createdCount++;
      }
    }
  }

  console.log(`\n[XULOSA] Jami qayta ishlangan: 15 ta (Yaratildi: ${createdCount}, Mavjud: ${existingCount})`);
  return { created: createdCount, existing: existingCount, secretsPath: SECRETS_FILE_PATH };
}

export async function verifyAccounts(apiBase: string): Promise<boolean> {
  console.log(`\n── Step 3: API orqali autentifikatsiya va izolyatsiya validatsiyasi (${apiBase}) ──`);
  const secrets = loadExistingSecrets(SECRETS_FILE_PATH);
  if (secrets.size < 15) {
    throw new Error(`Sirlar faylida barcha 15 ta hisob mavjud emas (${secrets.size}/15)`);
  }

  let allPassed = true;

  // 1. BUYERS
  console.log('\n[TEKSHIRUV: BUYERS]');
  for (const b of QA_ACCOUNTS.filter((x) => x.category === 'BUYER')) {
    const pwd = secrets.get(b.code)!;
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: b.login, password: pwd }),
    });

    if (!res.ok) {
      console.error(`❌ ${b.code} (${b.login}) login yiqildi: HTTP ${res.status}`);
      allPassed = false;
      continue;
    }
    const data = (await res.json()) as {
      accessToken: string;
      activeRole: string;
      roleChosen: boolean;
      profileDone: boolean;
    };
    if (data.activeRole !== 'BUYER' || !data.roleChosen || !data.profileDone) {
      console.error(`❌ ${b.code} noto'g'ri sessiya holati:`, data);
      allPassed = false;
      continue;
    }

    // Buyer panel profiling check
    const meRes = await fetch(`${apiBase}/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    const me = (await meRes.json()) as { roles: string[]; sellerStatus: string };
    if (!me.roles.includes('BUYER') || me.sellerStatus !== 'NOT_APPLIED') {
      console.error(`❌ ${b.code} /me holati noto'g'ri:`, me);
      allPassed = false;
      continue;
    }

    // Seller huquqi yo'qligini tekshirish (seller endpointiga kirish 403 bo'lishi kerak)
    const sellerRes = await fetch(`${apiBase}/seller/services`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (sellerRes.status !== 403) {
      console.error(`❌ ${b.code} seller endpointiga kirish bloklanmadi! Status: ${sellerRes.status}`);
      allPassed = false;
      continue;
    }

    // Staff huquqi yo'qligini tekshirish
    const staffRes = await fetch(`${apiBase}/staff/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (staffRes.status !== 401 && staffRes.status !== 403) {
      console.error(`❌ ${b.code} staff endpointiga kirish bloklanmadi! Status: ${staffRes.status}`);
      allPassed = false;
      continue;
    }

    console.log(`✅ ${b.code} (${b.login}) — Login OK, activeRole=BUYER, Seller/Staff huquqlari bloklangan.`);
  }

  // 2. SELLERS
  console.log('\n[TEKSHIRUV: SELLERS]');
  for (const s of QA_ACCOUNTS.filter((x) => x.category === 'SELLER')) {
    const pwd = secrets.get(s.code)!;
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: s.login, password: pwd }),
    });

    if (!res.ok) {
      console.error(`❌ ${s.code} (${s.login}) login yiqildi: HTTP ${res.status}`);
      allPassed = false;
      continue;
    }
    const data = (await res.json()) as {
      accessToken: string;
      activeRole: string;
      roleChosen: boolean;
      profileDone: boolean;
    };
    if (data.activeRole !== 'SELLER' || !data.roleChosen || !data.profileDone) {
      console.error(`❌ ${s.code} noto'g'ri sessiya holati:`, data);
      allPassed = false;
      continue;
    }

    // Seller panel profiling check
    const meRes = await fetch(`${apiBase}/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    const me = (await meRes.json()) as { roles: string[]; sellerStatus: string };
    if (!me.roles.includes('SELLER') || me.sellerStatus !== 'APPROVED') {
      console.error(`❌ ${s.code} /me holati noto'g'ri:`, me);
      allPassed = false;
      continue;
    }

    // Seller endpointiga ruxsat borligini tekshirish
    const sellerRes = await fetch(`${apiBase}/seller/services`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!sellerRes.ok) {
      console.error(`❌ ${s.code} seller xizmatlar ro'yxatiga kira olmadi! Status: ${sellerRes.status}`);
      allPassed = false;
      continue;
    }

    // Staff huquqi yo'qligini tekshirish
    const staffRes = await fetch(`${apiBase}/staff/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (staffRes.status !== 401 && staffRes.status !== 403) {
      console.error(`❌ ${s.code} staff endpointiga kirish bloklanmadi! Status: ${staffRes.status}`);
      allPassed = false;
      continue;
    }

    console.log(`✅ ${s.code} (${s.login}) — Login OK, activeRole=SELLER, sellerStatus=APPROVED, Staff huquqi bloklangan.`);
  }

  // 3. ADMINS
  console.log('\n[TEKSHIRUV: ADMINS]');
  for (const a of QA_ACCOUNTS.filter((x) => x.category === 'ADMIN')) {
    const pwd = secrets.get(a.code)!;
    const res = await fetch(`${apiBase}/staff/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: a.login, password: pwd }),
    });

    if (!res.ok) {
      console.error(`❌ ${a.code} (${a.login}) staff login yiqildi: HTTP ${res.status}`);
      allPassed = false;
      continue;
    }
    const data = (await res.json()) as {
      accessToken: string;
      role: string;
      permissions: string[];
      mustChangePassword: boolean;
    };

    if (data.role !== 'ADMIN' || data.mustChangePassword !== false) {
      console.error(`❌ ${a.code} noto'g'ri staff login javobi:`, data);
      allPassed = false;
      continue;
    }

    // GET /staff/me orqali to'liq profilni tekshirish
    const meRes = await fetch(`${apiBase}/staff/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!meRes.ok) {
      console.error(`❌ ${a.code} /staff/me so'rovi muvaffaqiyatsiz: HTTP ${meRes.status}`);
      allPassed = false;
      continue;
    }
    const staffMe = (await meRes.json()) as {
      id: string;
      role: string;
      permissions: string[];
      mustChangePassword: boolean;
      mfaEnabled: boolean;
    };

    if (
      staffMe.role !== 'ADMIN' ||
      staffMe.mustChangePassword !== false ||
      staffMe.mfaEnabled !== false
    ) {
      console.error(`❌ ${a.code} noto'g'ri staff ma'lumotlari:`, staffMe);
      allPassed = false;
      continue;
    }

    // Hech qaysi SUPER_ADMIN emasligini tasdiqlash
    if ((staffMe.role as string) === 'SUPER_ADMIN') {
      console.error(`❌ XAVFSIZLIK BUZILISHI: ${a.code} SUPER_ADMIN sifatida yaratilgan!`);
      allPassed = false;
      continue;
    }

    // Permission isolation tekshiruvi:
    // Super-admin only bo'lgan xodimlar ro'yxatiga kirish rad etilishi kerak
    const superAdminRes = await fetch(`${apiBase}/staff/admin/staff-members`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (superAdminRes.status !== 403) {
      console.error(`❌ ${a.code} super-admin boshqaruviga noqonuniy kirdi! Status: ${superAdminRes.status}`);
      allPassed = false;
      continue;
    }

    // Har bir admin o'z ruxsatiga ko'ra tekshiriladi
    if (a.code === 'QA-ADMIN-01') {
      const permittedRes = await fetch(`${apiBase}/staff/services?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const deniedRes = await fetch(`${apiBase}/staff/payments?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      if (!permittedRes.ok || deniedRes.status !== 403) {
        console.error(`❌ ${a.code} izolyatsiya xatosi: permitted=${permittedRes.status}, denied=${deniedRes.status}`);
        allPassed = false;
        continue;
      }
    } else if (a.code === 'QA-ADMIN-02') {
      const permittedRes = await fetch(`${apiBase}/staff/users?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const deniedRes = await fetch(`${apiBase}/staff/payments?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      if (!permittedRes.ok || deniedRes.status !== 403) {
        console.error(`❌ ${a.code} izolyatsiya xatosi: permitted=${permittedRes.status}, denied=${deniedRes.status}`);
        allPassed = false;
        continue;
      }
    } else if (a.code === 'QA-ADMIN-03') {
      const permittedRes = await fetch(`${apiBase}/staff/payments?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const deniedRes = await fetch(`${apiBase}/staff/categories`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      if (!permittedRes.ok || deniedRes.status !== 403) {
        console.error(`❌ ${a.code} izolyatsiya xatosi: permitted=${permittedRes.status}, denied=${deniedRes.status}`);
        allPassed = false;
        continue;
      }
    } else if (a.code === 'QA-ADMIN-04') {
      const permittedRes = await fetch(`${apiBase}/staff/categories`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const deniedRes = await fetch(`${apiBase}/staff/payments?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      if (!permittedRes.ok || deniedRes.status !== 403) {
        console.error(`❌ ${a.code} izolyatsiya xatosi: permitted=${permittedRes.status}, denied=${deniedRes.status}`);
        allPassed = false;
        continue;
      }
    } else if (a.code === 'QA-ADMIN-05') {
      const permittedRes = await fetch(`${apiBase}/staff/audit-logs?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const deniedRes = await fetch(`${apiBase}/staff/payments?perPage=1`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      if (!permittedRes.ok || deniedRes.status !== 403) {
        console.error(`❌ ${a.code} izolyatsiya xatosi: permitted=${permittedRes.status}, denied=${deniedRes.status}`);
        allPassed = false;
        continue;
      }
    }

    console.log(
      `✅ ${a.code} (${a.login}) — Login OK, role=ADMIN, SUPER_ADMIN emas, ruxsatlar izolyatsiyasi to'liq tasdiqlandi.`,
    );
  }

  return allPassed;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('XATOLIK: DATABASE_URL muhit o‘zgaruvchisi kiritilmadi.');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  const shouldVerify = process.argv.includes('--verify');
  const apiBase = process.env.API_BASE_URL || 'https://api.bobololadono.uz/api/v1';

  try {
    const { created, existing, secretsPath } = await bootstrapAccounts(prisma);
    console.log(`\n🎉 Bootstrap muvaffaqiyatli yakunlandi!`);
    console.log(`Parollar saqlangan fayl: ${secretsPath} (chmod 600)`);

    if (shouldVerify) {
      const passed = await verifyAccounts(apiBase);
      if (!passed) {
        console.error('\n❌ Bir yoki bir nechta hisob validatsiyadan o‘tmadi!');
        process.exit(1);
      }
      console.log('\n🌟 BARCHA 15 TA QA HISOBI TO‘LIQ VA MUVAFFAQIYATLI TEKSHIRILDI!');
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
