#!/usr/bin/env node
"use strict";

/**
 * Bobololadono — 3 Panels x 3 Accounts Seed & Verification Script
 *
 * Yaratadi:
 *   1. Xaridor (Buyer / Ish beruvchi) — 3 ta hisob (+998901110001 .. +998901110003)
 *   2. Mutaxassis (Specialist / Ijrochi) — 3 ta hisob (+998901110004 .. +998901110006)
 *   3. Admin (Boshqaruv) — 3 ta hisob:
 *      - Superadmin (superadmin@bobododa.uz)
 *      - Moderator (moderator@bobododa.uz)
 *      - Moliyaviy nazoratchi (moliya@bobododa.uz)
 *
 * Parol (barchasi uchun yagona, xavfsiz va eslab qolish oson):
 *   TestPass2026!
 *
 * Idempotent: qayta ishga tushirish xavfsiz (upsert).
 */

const fs = require("fs");
const path = require("path");

if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  const candidates = [
    "/home/laziz/Bobo-Doda/node_modules/.prisma/client/libquery_engine.node",
    path.resolve(__dirname, "../../node_modules/.prisma/client/libquery_engine.node"),
    path.resolve(__dirname, "../node_modules/.prisma/client/libquery_engine.node"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = c;
      break;
    }
  }
}

const {
  PrismaClient,
  Role,
  UserStatus,
  SellerStatus,
  SellerApplicationStatus,
  ServiceStatus,
  StaffRole,
  StaffPermission,
  StaffStatus,
} = require("@prisma/client");
const argon2 = require("argon2");
const { uuidv7 } = require("uuidv7");

const UNIFIED_PASSWORD = process.env.TEST_ACCOUNTS_PASSWORD || "TestPass2026!";

const BUYER_ACCOUNTS = [
  {
    code: "BUYER-01",
    phone: "+998901110001",
    fullName: "Alisher Xaridor (Tech Corp)",
    companyName: "Tech Corp MCHJ",
    industry: "Axborot texnologiyalari",
    location: "Toshkent shahri",
    bio: "IT, mobil ilovalar va backend tizimlar buyurtmachisi. Tezkor va sifatli ijrochilarni qidiramiz.",
  },
  {
    code: "BUYER-02",
    phone: "+998901110002",
    fullName: "Malika Xaridor (Creative Studio)",
    companyName: "Creative Branding MCHJ",
    industry: "Marketing va Reklama",
    location: "Samarqand",
    bio: "Brending, grafika, video montaj va kontent tayyorlash bo'yicha loyihalar beruvchi.",
  },
  {
    code: "BUYER-03",
    phone: "+998901110003",
    fullName: "Bobur Xaridor (E-Commerce)",
    companyName: "Silk Road E-Commerce",
    industry: "Elektron tijorat",
    location: "Buxoro",
    bio: "Internet do'konlar, to'lov tizimlari va CRM integratsiyalari uchun buyurtmalar beruvchi.",
  },
];

const SPECIALIST_ACCOUNTS = [
  {
    code: "SPECIALIST-01",
    phone: "+998901110004",
    fullName: "Jasur Dasturchi (Full-stack Dev)",
    location: "Toshkent shahri",
    bio: "Senior Full-stack dasturchi (Node.js, NestJS, Next.js, PostgreSQL). 6+ yillik tijoriy tajriba. Murakkab veb-saytlar va APIlar ishlab chiqaman.",
    appLegalName: "Jasur Dasturchi",
    appDisplayName: "Jasur Dasturchi (Full-Stack)",
    appDescription: "Senior Full-stack dasturchi (Node.js, NestJS, Next.js, PostgreSQL).",
    service: {
      categorySlug: "dasturlash",
      title: "Full-Stack Web Dasturlash va API ishlab chiqish",
      description: "Sizning biznesingiz uchun yuqori sifatli veb-sayt yoki REST/GraphQL API ishlab chiqaman. Tezkor, xavfsiz va toza arxitektura.",
      priceTiyin: BigInt(500000000), // 5 000 000 UZS
      deliveryDays: 7,
    },
  },
  {
    code: "SPECIALIST-02",
    phone: "+998901110005",
    fullName: "Diyora Dizayner (UI/UX & Branding)",
    location: "Toshkent shahri",
    bio: "Senior UI/UX dizayner va Art Director. Figma, mobil ilovalar, veb platformalar va brend identikasi dizayni bo'yicha 5+ yillik tajriba.",
    appLegalName: "Diyora Dizayner",
    appDisplayName: "Diyora Dizayner (UI/UX Pro)",
    appDescription: "Senior UI/UX dizayner va Art Director.",
    service: {
      categorySlug: "dizayn",
      title: "Mobil Ilova va Veb-sayt uchun Zamonaviy UI/UX Dizayn",
      description: "Foydalanuvchilar uchun qulay, konversiyasi yuqori bo'lgan zamonaviy UI/UX dizayn. Figma komponentlari va to'liq interaktiv prototip.",
      priceTiyin: BigInt(350000000), // 3 500 000 UZS
      deliveryDays: 5,
    },
  },
  {
    code: "SPECIALIST-03",
    phone: "+998901110006",
    fullName: "Sardor Marketolog (Target & SMM)",
    location: "Farg'ona",
    bio: "Raqamli marketing, maqsadli (target) reklama, kontekst reklama va SMM mutaxassisi. Savdo hajmini 3 barobargacha oshirish bo'yicha keyslar mavjud.",
    appLegalName: "Sardor Marketolog",
    appDisplayName: "Sardor Marketolog (Target & SMM)",
    appDescription: "Raqamli marketing va target reklama mutaxassisi.",
    service: {
      categorySlug: "marketing",
      title: "To'liq Target Reklama va Ijtimoiy Tarmoqlarda SMM Boshqaruvi",
      description: "Instagram, Facebook va Telegram kanallaringiz uchun professional target reklama sozlash, auditoriyani segmentlash va byudjet optimallashtirish.",
      priceTiyin: BigInt(250000000), // 2 500 000 UZS
      deliveryDays: 10,
    },
  },
];

const ALL_STAFF_PERMISSIONS = Object.values(StaffPermission);

const ADMIN_ACCOUNTS = [
  {
    code: "ADMIN-01",
    email: "superadmin@bobododa.uz",
    fullName: "Boshqaruvchi Superadmin",
    title: "Chief Platform Super Administrator",
    role: StaffRole.SUPER_ADMIN,
    permissions: ALL_STAFF_PERMISSIONS,
    portal: "/rahbariyat/kirish",
    note: "To'liq vakolatli Superadmin (barcha 16 huquq, /super/adminlar boshqaruvi)",
  },
  {
    code: "ADMIN-02",
    email: "moderator@bobododa.uz",
    fullName: "Moderator Nazoratchi",
    title: "Bosh Kontent va Foydalanuvchilar Moderatori",
    role: StaffRole.ADMIN,
    permissions: [
      StaffPermission.DASHBOARD,
      StaffPermission.USERS,
      StaffPermission.SERVICES,
      StaffPermission.JOBS,
      StaffPermission.KYC,
      StaffPermission.REPORTS,
      StaffPermission.APPEALS,
      StaffPermission.REVIEWS,
      StaffPermission.SUPPORT,
      StaffPermission.CATEGORIES,
    ],
    portal: "/admin/kirish",
    note: "Foydalanuvchilar, xizmatlar, e'lonlar va shikoyatlar moderatsiyasi",
  },
  {
    code: "ADMIN-03",
    email: "moliya@bobododa.uz",
    fullName: "Moliyaviy Nazoratchi",
    title: "Moliya va To'lovlar Nazoratchisi",
    role: StaffRole.ADMIN,
    permissions: [
      StaffPermission.DASHBOARD,
      StaffPermission.ORDERS,
      StaffPermission.DISPUTES,
      StaffPermission.PAYMENTS,
      StaffPermission.REPORTS,
    ],
    portal: "/admin/kirish",
    note: "Buyurtmalar, to'lovlar, escrow mablag'lari, nizolar va hisobotlar nazorati",
  },
];

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("==========================================================");
    console.log("🚀 BOBOLOLADONO — BOOST TEST HISOB-KITOBI BOSHLANDI");
    console.log("==========================================================");

    console.log("\n[1/4] Argon2id parolini hashlash...");
    const passwordHash = await argon2.hash(UNIFIED_PASSWORD, { type: argon2.argon2id });
    console.log("✅ Parol muvaffaqiyatli hashlandi: " + UNIFIED_PASSWORD);

    // Kategoriya xaritasini olish
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));

    // ─────────────────────────────────────────────────────────────
    // [2/4] XARIDOR (BUYER) HISOB-LARI
    // ─────────────────────────────────────────────────────────────
    console.log("\n[2/4] Xaridor (Buyer) hisoblarini yaratish/yangilash...");
    for (const b of BUYER_ACCOUNTS) {
      const existing = await prisma.user.findUnique({ where: { phone: b.phone } });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            fullName: b.fullName,
            passwordHash,
            roles: [Role.BUYER],
            roleChosen: true,
            lastActiveRole: Role.BUYER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.NOT_APPLIED,
            companyName: b.companyName,
            industry: b.industry,
            location: b.location,
            bio: b.bio,
          },
        });
        console.log(`  ✓ [BUYER] ${b.code} (${b.phone}): yangilandi.`);
      } else {
        await prisma.user.create({
          data: {
            id: uuidv7(),
            phone: b.phone,
            fullName: b.fullName,
            passwordHash,
            roles: [Role.BUYER],
            roleChosen: true,
            lastActiveRole: Role.BUYER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.NOT_APPLIED,
            companyName: b.companyName,
            industry: b.industry,
            location: b.location,
            bio: b.bio,
          },
        });
        console.log(`  ✓ [BUYER] ${b.code} (${b.phone}): yaratildi.`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // [3/4] MUTAXASSIS (SELLER/SPECIALIST) HISOB-LARI
    // ─────────────────────────────────────────────────────────────
    console.log("\n[3/4] Mutaxassis (Specialist) hisoblarini yaratish/yangilash...");
    for (const s of SPECIALIST_ACCOUNTS) {
      let userId;
      const existing = await prisma.user.findUnique({
        where: { phone: s.phone },
        include: { sellerApplications: true },
      });

      if (existing) {
        userId = existing.id;
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            fullName: s.fullName,
            passwordHash,
            roles: [Role.SELLER],
            roleChosen: true,
            lastActiveRole: Role.SELLER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.APPROVED,
            location: s.location,
            bio: s.bio,
          },
        });

        if (existing.sellerApplications.length === 0) {
          await prisma.sellerApplication.create({
            data: {
              id: uuidv7(),
              userId: existing.id,
              legalName: s.appLegalName,
              displayName: s.appDisplayName,
              description: s.appDescription,
              status: SellerApplicationStatus.APPROVED,
              submittedAt: new Date(),
              reviewedAt: new Date(),
            },
          });
        }
        console.log(`  ✓ [MUTAXASSIS] ${s.code} (${s.phone}): yangilandi (APPROVED).`);
      } else {
        userId = uuidv7();
        await prisma.user.create({
          data: {
            id: userId,
            phone: s.phone,
            fullName: s.fullName,
            passwordHash,
            roles: [Role.SELLER],
            roleChosen: true,
            lastActiveRole: Role.SELLER,
            profileDone: true,
            verified: true,
            status: UserStatus.ACTIVE,
            sellerStatus: SellerStatus.APPROVED,
            location: s.location,
            bio: s.bio,
          },
        });
        await prisma.sellerApplication.create({
          data: {
            id: uuidv7(),
            userId,
            legalName: s.appLegalName,
            displayName: s.appDisplayName,
            description: s.appDescription,
            status: SellerApplicationStatus.APPROVED,
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
        });
        console.log(`  ✓ [MUTAXASSIS] ${s.code} (${s.phone}): yaratildi (APPROVED).`);
      }

      // Pre-seed faol xizmat (Service)
      const categoryId = categoryMap.get(s.service.categorySlug);
      if (categoryId) {
        const existingService = await prisma.service.findFirst({
          where: { sellerId: userId, title: s.service.title },
        });
        if (!existingService) {
          await prisma.service.create({
            data: {
              id: uuidv7(),
              sellerId: userId,
              categoryId,
              title: s.service.title,
              description: s.service.description,
              lang: "uz",
              price: s.service.priceTiyin,
              currency: "UZS",
              deliveryDays: s.service.deliveryDays,
              status: ServiceStatus.ACTIVE,
              publishedAt: new Date(),
              submittedAt: new Date(),
              reviewedAt: new Date(),
            },
          });
          console.log(`    ↳ Faol xizmat yaratildi: "${s.service.title}"`);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // [4/4] ADMIN HISOB-LARI
    // ─────────────────────────────────────────────────────────────
    console.log("\n[4/4] Admin (Boshqaruv) hisoblarini yaratish/yangilash...");
    for (const a of ADMIN_ACCOUNTS) {
      const existing = await prisma.staffMember.findUnique({ where: { email: a.email } });
      if (existing) {
        await prisma.staffMember.update({
          where: { email: a.email },
          data: {
            fullName: a.fullName,
            title: a.title,
            role: a.role,
            permissions: a.permissions,
            status: StaffStatus.ACTIVE,
            mustChangePassword: false,
            mfaEnabled: false,
            passwordHash,
          },
        });
        console.log(`  ✓ [ADMIN] ${a.code} (${a.email}): yangilandi (${a.role}).`);
      } else {
        await prisma.staffMember.create({
          data: {
            id: uuidv7(),
            email: a.email,
            fullName: a.fullName,
            title: a.title,
            role: a.role,
            permissions: a.permissions,
            status: StaffStatus.ACTIVE,
            mustChangePassword: false,
            mfaEnabled: false,
            passwordHash,
          },
        });
        console.log(`  ✓ [ADMIN] ${a.code} (${a.email}): yaratildi (${a.role}).`);
      }
    }

    console.log("\n==========================================================");
    console.log("✅ BARCHA 9 TA HISOB MUVAFFAQIYATLI SEED QILINDI!");
    console.log("==========================================================");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN SEED SCRIPT:", err);
  process.exit(1);
});
