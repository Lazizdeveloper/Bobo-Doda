/**
 * i18n Translation Integrity Check
 *
 * Tekshiradi:
 * 1. dictionary.ts (uz, ru) va en.ts kalitlari 100% sinxron (drift yo'q)
 * 2. Hech qaysi kalit bo'sh emas va xom kalit nomiga teng emas
 * 3. Frontend (app/, components/, lib/)dagi barcha statik va dinamik t() chaqiruvlari
 *    lug'atda mavjud
 * 4. Fallback xavfsizligi: nav.home RU="На главную", UZ="Bosh sahifa", EN="Home"
 *    va production'da xom kalitlar UI ga sizib chiqmasligi
 *
 * npm run check:i18n va npm run verify orqali ishga tushadi.
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");

function loadTsModule(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const transpiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  });
  const m = { exports: {} };
  const dir = path.dirname(fullPath);
  const customRequire = (id) => {
    if (id.includes("fees")) return { PLATFORM_FEE_PERCENT: 5 };
    if (id.startsWith("@/")) {
      const target = path.join(ROOT, id.replace("@/", ""));
      if (fs.existsSync(target + ".ts")) return loadTsModule(target + ".ts");
      if (fs.existsSync(target + ".tsx")) return loadTsModule(target + ".tsx");
      return require(target);
    }
    if (id.startsWith(".")) {
      const target = path.resolve(dir, id);
      if (fs.existsSync(target + ".ts")) return loadTsModule(path.relative(ROOT, target + ".ts"));
      if (fs.existsSync(target + ".tsx")) return loadTsModule(path.relative(ROOT, target + ".tsx"));
      return require(target);
    }
    return require(id);
  };
  const fn = new Function("require", "module", "exports", transpiled.outputText);
  fn(customRequire, m, m.exports);
  return m.exports;
}

function scanFiles(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", ".git", "test-results", ".next-qa", ".next-e2e", "backend", "packages"].includes(entry.name)) {
        scanFiles(full, fileList);
      }
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      fileList.push(full);
    }
  }
  return fileList;
}

function main() {
  const errors = [];

  // 1. Lug'atlarni yuklash
  const { dictionary } = loadTsModule("lib/i18n/dictionary.ts");
  const { en } = loadTsModule("lib/i18n/en.ts");
  const { translate } = loadTsModule("lib/i18n/index.tsx");

  const dictKeys = Object.keys(dictionary);
  const enKeys = Object.keys(en);
  const dictKeySet = new Set(dictKeys);
  const enKeySet = new Set(enKeys);

  // 1.1 Drift tekshiruvi
  const missingInEn = dictKeys.filter((k) => !enKeySet.has(k));
  const missingInDict = enKeys.filter((k) => !dictKeySet.has(k));

  if (missingInEn.length > 0) {
    errors.push(`dictionary.ts da bor, lekin en.ts da yo'q kalitlar (${missingInEn.length} ta): ${missingInEn.slice(0, 10).join(", ")}`);
  }
  if (missingInDict.length > 0) {
    errors.push(`en.ts da bor, lekin dictionary.ts da yo'q kalitlar (${missingInDict.length} ta): ${missingInDict.slice(0, 10).join(", ")}`);
  }

  // 2. Bo'sh yoki xom qiymatlar
  for (const [k, v] of Object.entries(dictionary)) {
    if (!v.uz || typeof v.uz !== "string" || !v.uz.trim()) {
      errors.push(`Bo'sh UZ tarjima: "${k}"`);
    }
    if (!v.ru || typeof v.ru !== "string" || !v.ru.trim()) {
      errors.push(`Bo'sh RU tarjima: "${k}"`);
    }
    if (v.uz === k || v.ru === k) {
      errors.push(`Lug'atda xom kalit qiymat sifatida berilgan: "${k}"`);
    }
  }

  for (const [k, v] of Object.entries(en)) {
    if (!v || typeof v !== "string" || !v.trim()) {
      errors.push(`Bo'sh EN tarjima: "${k}"`);
    }
    if (v === k) {
      errors.push(`en.ts da xom kalit qiymat sifatida berilgan: "${k}"`);
    }
  }

  // 3. Frontend kodidagi t() chaqiruvlari
  const frontendFiles = [
    ...scanFiles(path.join(ROOT, "app")),
    ...scanFiles(path.join(ROOT, "components")),
    ...scanFiles(path.join(ROOT, "lib")).filter((f) => !f.includes("lib/i18n")),
  ];

  const staticTRegex = /\bt\(\s*["\x27]([^"\x27]+)["\x27]\s*\)/g;
  const missingInCode = new Map();

  for (const filePath of frontendFiles) {
    const rel = path.relative(ROOT, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    let match;
    while ((match = staticTRegex.exec(content)) !== null) {
      const key = match[1];
      if (!dictKeySet.has(key)) {
        if (!missingInCode.has(key)) missingInCode.set(key, []);
        missingInCode.get(key).push(rel);
      }
    }
  }

  if (missingInCode.size > 0) {
    for (const [k, files] of missingInCode.entries()) {
      errors.push(`Frontend da ishlatilgan lekin lug'atda yo'q kalit: "${k}" (${files.join(", ")})`);
    }
  }

  // 4. Aniq muhim kalitlar va barcha dinamik kalitlar mavjudligi
  const criticalKeys = [
    "nav.home",
    "nav.offers",
    "nav.dashboard",
    "nav.services",
    "nav.jobs",
    "nav.proposals",
    "nav.contracts",
    "bset.notifSaved",
    "ntf.milestoneApproved",
    "ntf.newContract",
    "common.home",
    "common.back",
    "hc.title",
    "hc.back",
  ];

  // 4.1 Barcha dinamik domenlar kalitlari
  const dynamicDomains = [
    // Kategoriyalar
    ["dizayn", "dasturlash", "tarjima", "kontent", "marketing", "video", "audio", "biznes"].map((c) => `cat.${c}`),
    // Til darajalari
    ["native", "fluent", "intermediate", "basic"].map((lvl) => `lang.${lvl}`),
    // Shartnoma holatlari
    ["imzolangan", "faol", "yakunlangan", "bekor_qilingan", "nizo"].map((s) => `cstatus.${s}`),
    // Taklif holatlari
    ["yuborilgan", "korib_chiqilmoqda", "suhbat", "yollandi", "rad_etildi", "qaytarib_olingan"].map((s) => `pstatus.${s}`),
    // Taklif (offer) holatlari
    ["yuborilgan", "qabul_qilindi", "rad_etildi", "bekor_qilingan"].map((s) => `ostatus.${s}`),
    // Xizmat holatlari
    ["active", "paused", "draft", "pending_review", "rejected", "archived"].map((s) => `svcStatus.${s}`),
    // Bosqich holatlari
    ["kutilmoqda", "mablaglangan", "topshirildi", "qabul_qilindi", "ozgartirish_soraldi"].map((s) => `ms.${s}`),
    // Nizo sabablari va holatlari
    ["scope", "quality", "deadline", "payment", "communication", "other"].map((r) => `dispute.reason_${r}`),
    ["ochiq", "korib_chiqilmoqda", "hal_qilindi"].map((s) => `dispute.status_${s}`),
    // Yordam markazi
    ["tolov", "shartnoma", "nizo", "hisob", "texnik", "boshqa"].map((t) => `help.topic_${t}`),
    ["ochiq", "javob_berildi", "yopilgan"].map((s) => `help.status_${s}`),
    // Support modal toifalari
    ["tolov_escrow", "loyiha", "mutaxassis", "profil", "tasdiqlash", "texnik", "hisob", "boshqa"].map((c) => `support.cat_${c}`),
    // Verifikatsiya holatlari
    ["boshlanmagan", "korib_chiqilmoqda", "tasdiqlangan", "rad_etilgan"].map((s) => `verify.${s}`),
    // Trust nishonlari
    ["yangi", "ishonchli", "top_mutaxassis"].flatMap((b) => [`badge.${b}`, `badge.${b}Hint`]),
    // Maxfiylik va bildirishnoma sozlamalari
    ["messages", "contracts", "payments", "marketing"].map((p) => `privacy.${p}`),
    // Profil to'liqligi
    ["settings.ckName", "settings.ckHeadline", "settings.ckBio", "settings.ckSkills", "settings.ckLanguages", "settings.ckPortfolio", "settings.ckLocation", "settings.ckService"],
    // API katalogidagi barcha bildirishnomalar (docs/00-api-surface.md §6)
    [
      "ntf.newOffer", "ntf.offerAccepted", "ntf.offerDeclined", "ntf.offerWithdrawn",
      "ntf.newProposal", "ntf.proposalInterview", "ntf.proposalRejected", "ntf.hired",
      "ntf.newContract", "ntf.contractSigned", "ntf.contractFunded", "ntf.milestoneFunded",
      "ntf.milestoneSubmitted", "ntf.milestoneAccepted", "ntf.milestoneApproved",
      "ntf.milestoneAutoAccepted", "ntf.revisionRequested", "ntf.closeRequested",
      "ntf.contractCompleted", "ntf.contractCancelled", "ntf.refundIssued",
      "ntf.newMessage", "ntf.newReview", "ntf.disputeOpened", "ntf.disputeWithdrawn",
      "ntf.disputeResolved", "ntf.kycApproved", "ntf.kycRejected",
      "ntf.withdrawalApproved", "ntf.withdrawalRejected", "ntf.jobClosedByAdmin",
      "ntf.servicePaused", "ntf.serviceRestored", "ntf.supportReplied",
      "ntf.b2bPending", "ntf.b2bRejected", "ntf.newMatchingJob",
    ],
  ].flat();

  // 4.2 category-fields metadata
  const { categoryFields } = loadTsModule("lib/category-fields.ts");
  const fieldKeys = [];
  for (const fields of Object.values(categoryFields)) {
    for (const f of fields) {
      if (f.labelKey) fieldKeys.push(f.labelKey);
      if (f.placeholderKey) fieldKeys.push(f.placeholderKey);
      if (f.optionKeys) fieldKeys.push(...f.optionKeys);
    }
  }

  const allMandatoryKeys = Array.from(new Set([...criticalKeys, ...dynamicDomains, ...fieldKeys]));
  for (const k of allMandatoryKeys) {
    if (!dictKeySet.has(k) || !enKeySet.has(k)) {
      errors.push(`Majburiy dinamik/kritik kalit yetishmayapti: "${k}"`);
    }
  }

  // 5. Tarjima funksiyasi va fallback tekshiruvlari
  // 5.1 Mavjud kalitlar barcha 3 tilda to'g'ri qaytarilishi
  if (translate("ru", "nav.home") !== "На главную") {
    errors.push(`RU "nav.home" noto'g'ri: kutilgan "На главную", olindi "${translate("ru", "nav.home")}"`);
  }
  if (translate("uz", "nav.home") !== "Bosh sahifa") {
    errors.push(`UZ "nav.home" noto'g'ri: kutilgan "Bosh sahifa", olindi "${translate("uz", "nav.home")}"`);
  }
  if (translate("en", "nav.home") !== "Home") {
    errors.push(`EN "nav.home" noto'g'ri: kutilgan "Home", olindi "${translate("en", "nav.home")}"`);
  }

  // 5.2 Dev/test muhitida yetishmayotgan kalit yashirilmasdan xom holda qaytishi (testlarda sezilishi shart)
  const prevEnv = process.env.NODE_ENV;
  const origWarn = console.warn;
  let warnLogged = false;
  console.warn = () => {
    warnLogged = true;
  };
  try {
    process.env.NODE_ENV = "test";
    const devMissing = translate("ru", "nonexistent.translation.key");
    if (devMissing !== "nonexistent.translation.key") {
      errors.push(`Dev/test fallback xatosi: missing key xom holda qaytarilmadi, olindi "${devMissing}"`);
    }
    if (!warnLogged) {
      errors.push("Dev/test fallback xatosi: missing key uchun console.warn chaqirilmadi");
    }

    // 5.3 Production muhitida xom kalit o'rniga xavfsiz inson o'qiy oladigan matn qaytishi
    process.env.NODE_ENV = "production";
    const prodMissing = translate("ru", "nonexistent.test_key");
    if (prodMissing.includes(".") || prodMissing === "nonexistent.test_key") {
      errors.push(`Production fallback xatosi: xom kalit UI ga sizib chiqdi: "${prodMissing}"`);
    }
    if (prodMissing !== "Test key") {
      errors.push(`Production humanize xatosi: kutilgan "Test key", olindi "${prodMissing}"`);
    }
  } finally {
    process.env.NODE_ENV = prevEnv;
    console.warn = origWarn;
  }

  // 6. Xulosa
  if (errors.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          check: "i18n-integrity",
          errorCount: errors.length,
          errors,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      check: "i18n-integrity",
      totalDictionaryKeys: dictKeys.length,
      totalEnKeys: enKeys.length,
      filesScanned: frontendFiles.length,
      criticalKeysVerified: criticalKeys.length,
      navHome: {
        ru: translate("ru", "nav.home"),
        uz: translate("uz", "nav.home"),
        en: translate("en", "nav.home"),
      },
    })
  );
}

main();
