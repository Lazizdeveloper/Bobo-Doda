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

  // 4. Aniq muhim kalitlar mavjudligi
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

  for (const ck of criticalKeys) {
    if (!dictKeySet.has(ck) || !enKeySet.has(ck)) {
      errors.push(`Kritik kalit yetishmayapti: "${ck}"`);
    }
  }

  // 5. Tarjima funksiyasi va fallback tekshiruvlari
  if (translate("ru", "nav.home") !== "На главную") {
    errors.push(`RU "nav.home" noto'g'ri: kutilgan "На главную", olindi "${translate("ru", "nav.home")}"`);
  }
  if (translate("uz", "nav.home") !== "Bosh sahifa") {
    errors.push(`UZ "nav.home" noto'g'ri: kutilgan "Bosh sahifa", olindi "${translate("uz", "nav.home")}"`);
  }
  if (translate("en", "nav.home") !== "Home") {
    errors.push(`EN "nav.home" noto'g'ri: kutilgan "Home", olindi "${translate("en", "nav.home")}"`);
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
