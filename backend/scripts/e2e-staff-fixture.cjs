#!/usr/bin/env node
/**
 * Bosqich 18 — ISOLATED admin E2E muhiti uchun test-only staff hisoblarini
 * yaratadi. Real ishlab chiqarish parol-hashlash kodi ishlatiladi
 * (`dist/common/security/hash.service.js` — argon2id, xuddi haqiqiy staff
 * onboarding'da ishlatiladigan BITTA manba), shorcut/soxta hash EMAS.
 *
 * XAVFSIZLIK: bu skript FAQAT `DATABASE_URL`da "bobododa_e2e" bo'lsa
 * ishlaydi — real dev/prod bazasiga yozib yuborish ehtimoli oldini olish
 * uchun ataylab qattiq tekshiruv (pastga qarang). Docs: RUNBOOK §18.
 *
 * Ishlatish (`backend/` papkasidan, nix-shell ichida — Prisma engine kerak):
 *   DATABASE_URL=postgresql://bobododa_app:app@127.0.0.1:55433/bobododa_e2e?schema=public \
 *     node scripts/e2e-staff-fixture.cjs
 *
 * Uchta hisob yaratadi (mavjud bo'lsa email bo'yicha yangilanadi — idempotent):
 *   1. super@e2e.test        — SUPER_ADMIN, BARCHA huquq, ACTIVE, parolni
 *      almashtirish shart emas — asosiy admin E2E oqimi uchun.
 *   2. reset@e2e.test        — SUPER_ADMIN, mustChangePassword=true —
 *      "temp password" hard-gate stsenariysi uchun.
 *   3. restricted@e2e.test   — ADMIN roli (SUPER_ADMIN EMAS — shuning uchun
 *      `/rahbariyat` portaliga kira olmaydi, lekin `/admin/kirish`ning
 *      `expectedRole="admin"` tekshiruvidan o'tadi), FAQAT DASHBOARD huquqi
 *      — ruxsat (403 + frontendda "Access Denied") sinovi uchun: rol to'g'ri
 *      portalga kiradi, lekin HUQUQ yetishmaydi (Foydalanuvchilar/Shartnoma/
 *      Nizolar/To'lovlar/Audit — barchasi bloklanishi kerak).
 *
 * Uchalasining test paroli: process.env.E2E_STAFF_PASSWORD yoki sukut
 * "E2eTest#2026Pass" (faqat isolated E2E bazasida — real secret EMAS,
 * commit qilinadi, chunki hech qanday real muhitga aloqasi yo'q).
 */
"use strict";

const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PrismaClient, StaffRole, StaffPermission, StaffStatus } = require("@prisma/client");
const { HashService } = require(path.join(__dirname, "..", "dist", "common", "security", "hash.service.js"));

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL.includes("bobododa_e2e")) {
  console.error(
    "REFUSING: DATABASE_URL bobododa_e2e'ni o'z ichiga olmaydi — bu skript FAQAT isolated E2E bazasiga yozadi.\n" +
      "Joriy DATABASE_URL: " + (DATABASE_URL || "(bo'sh)"),
  );
  process.exit(1);
}

const TEST_PASSWORD = process.env.E2E_STAFF_PASSWORD || "E2eTest#2026Pass";
const ALL_PERMISSIONS = Object.values(StaffPermission);

async function upsertStaff(prisma, hasher, { email, fullName, title, role, permissions, mustChangePassword }) {
  const passwordHash = await hasher.hash(TEST_PASSWORD);
  const existing = await prisma.staffMember.findUnique({ where: { email } });
  if (existing) {
    const updated = await prisma.staffMember.update({
      where: { email },
      data: { passwordHash, role, permissions, mustChangePassword, status: StaffStatus.ACTIVE, fullName, title },
    });
    console.log(`updated: ${email} (${role})`);
    return updated;
  }
  const created = await prisma.staffMember.create({
    data: {
      id: randomUUID(),
      email,
      fullName,
      title,
      passwordHash,
      role,
      permissions,
      status: StaffStatus.ACTIVE,
      mustChangePassword,
      mfaEnabled: false,
    },
  });
  console.log(`created: ${email} (${role})`);
  return created;
}

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  const hasher = new HashService();
  try {
    await upsertStaff(prisma, hasher, {
      email: "super@e2e.test",
      fullName: "E2E Super Admin",
      title: "E2E Fixture",
      role: StaffRole.SUPER_ADMIN,
      permissions: ALL_PERMISSIONS,
      mustChangePassword: false,
    });
    await upsertStaff(prisma, hasher, {
      email: "reset@e2e.test",
      fullName: "E2E Reset Admin",
      title: "E2E Fixture (mustChangePassword)",
      role: StaffRole.SUPER_ADMIN,
      permissions: ALL_PERMISSIONS,
      mustChangePassword: true,
    });
    await upsertStaff(prisma, hasher, {
      email: "restricted@e2e.test",
      fullName: "E2E Restricted Admin",
      title: "E2E Fixture (permission test)",
      role: StaffRole.ADMIN,
      permissions: [StaffPermission.DASHBOARD],
      mustChangePassword: false,
    });
    console.log("\nOK — test password:", TEST_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
